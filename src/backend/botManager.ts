import { GridStrategy } from './strategies/grid.ts';
import { DCAStrategy } from './strategies/dca.ts';
import db from './db/session.ts';
import { HyperliquidClient, HyperliquidWS } from './exchange/hyperliquidClient.ts';
import { RiskManager } from './risk/riskManager.ts';
import { MarketSelector } from './services/marketSelector.ts';
import { config } from './config.ts';

export class BotManager {
  private activeBots: Map<string, any> = new Map();
  private hlClient: HyperliquidClient;
  private hlWs: HyperliquidWS;
  private riskManager: RiskManager;
  private marketSelector: MarketSelector;
  private isReconciling: boolean = false;
  private lastReconciliation: string = '';

  constructor() {
    this.hlClient = new HyperliquidClient();
    this.hlWs = new HyperliquidWS();
    this.riskManager = new RiskManager(this.hlClient);
    this.marketSelector = new MarketSelector(this.hlClient);
    
    this.hlWs.connect();
    this.hlWs.onReconnect(() => {
      console.log('WS reconnected, triggering state resync...');
      this.reconcile().catch(console.error);
    });
  }

  resetCircuitBreaker() {
    this.riskManager.resetBreaker();
  }

  getSystemStatus() {
    return {
      circuitBreaker: this.riskManager.getStatus(),
      websocket: {
        healthy: this.hlWs.isHealthy(),
      },
      reconciliation: {
        lastRun: this.lastReconciliation,
        inProgress: this.isReconciling
      },
      marketSelection: {
        selected: this.marketSelector.getSelectedSymbols(),
        enabled: config.marketSelectionEnabled
      }
    };
  }

  getMarketRankings() {
    return this.marketSelector.getRankings();
  }

  async startBot(id: string) {
    if (await this.riskManager.checkDrawdown()) {
      throw new Error('Circuit breaker active. Cannot start bots.');
    }
    const botData = db.prepare('SELECT * FROM bots WHERE id = ?').get(id) as any;
    if (!botData) throw new Error('Bot not found');

    // Market Selection Check
    if (config.marketSelectionEnabled && !this.marketSelector.getSelectedSymbols().includes(botData.symbol)) {
      throw new Error(`Market ${botData.symbol} is not currently selected for trading.`);
    }

    const botConfig = JSON.parse(botData.config);
    let bot;

    if (botData.strategy === 'GRID') {
      bot = new GridStrategy(botData.id, botData.symbol, botConfig, this.riskManager);
    } else if (botData.strategy === 'DCA') {
      bot = new DCAStrategy(botData.id, botData.symbol, botConfig, this.riskManager);
    } else {
      throw new Error(`Unknown strategy ${botData.strategy}`);
    }

    // Subscribe to real-time updates for risk management
    this.hlWs.subscribeL2(botData.symbol, (data) => {
      if (data.levels && data.levels[0] && data.levels[0][0] && data.levels[1] && data.levels[1][0]) {
        const midPrice = (parseFloat(data.levels[0][0].px) + parseFloat(data.levels[1][0].px)) / 2;
        this.riskManager.updatePrice(botData.symbol, midPrice);
      }
    });

    await bot.start();
    this.activeBots.set(id, bot);
    
    db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('RUNNING', id);
  }

  async stopBot(id: string) {
    const bot = this.activeBots.get(id);
    if (bot) {
      await bot.stop();
      this.activeBots.delete(id);
    }
    db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('STOPPED', id);
  }

  async initFromDb() {
    // Initial Market Selection (Background)
    if (config.marketSelectionEnabled) {
      this.marketSelector.update().catch(err => console.error('[BotManager] Initial market selection failed:', err));
    }

    const runningBots = db.prepare("SELECT id FROM bots WHERE status = 'RUNNING'").all() as any[];
    for (const b of runningBots) {
      try {
        await this.startBot(b.id);
      } catch (error) {
        console.error(`Failed to restart bot ${b.id}:`, error);
      }
    }
    this.startReconciliationLoop();
    this.startMarketSelectionLoop();
  }

  private startMarketSelectionLoop() {
    if (!config.marketSelectionEnabled) return;

    setInterval(async () => {
      console.log('[BotManager] Running periodic market selection update...');
      await this.marketSelector.update();
      await this.enforceMarketSelection();
    }, config.marketSelectionIntervalMs);
  }

  private startReconciliationLoop() {
    setInterval(async () => {
      if (this.isReconciling) return;
      this.isReconciling = true;
      try {
        // Circuit Breaker Check
        const isBreakerTriggered = await this.riskManager.checkDrawdown();
        if (isBreakerTriggered) {
          await this.stopAllBots();
          await this.hlClient.cancelAllOrders();
          return;
        }

        await this.reconcile();
        await this.takePnLSnapshot();
      } catch (error) {
        console.error('Reconciliation failed:', error);
      } finally {
        this.isReconciling = false;
      }
    }, 20000); // 20 seconds
  }

  private async takePnLSnapshot() {
    try {
      const state = await this.hlClient.getAccountState();
      const equity = parseFloat(state.crossMarginSummary?.accountValue || "0");
      const initialEquity = this.riskManager.getStatus().initialEquity || equity;
      const totalPnL = equity - initialEquity;

      db.prepare('INSERT INTO pnl_snapshots (total_pnl, timestamp) VALUES (?, ?)').run(
        totalPnL,
        new Date().toISOString()
      );

      // Clean up old snapshots (keep last 1000)
      db.prepare('DELETE FROM pnl_snapshots WHERE id IN (SELECT id FROM pnl_snapshots ORDER BY timestamp DESC LIMIT -1 OFFSET 1000)').run();
    } catch (e) {
      console.error('[BotManager] Failed to take PnL snapshot:', e);
    }
  }

  getGlobalStats() {
    const bots = db.prepare("SELECT * FROM bots").all() as any[];
    const orders = db.prepare("SELECT * FROM orders").all() as any[];
    const fills = db.prepare("SELECT * FROM fills").all() as any[];
    
    const totalVolume = orders.reduce((sum, o) => sum + (o.price * o.size), 0);
    const filledOrders = orders.filter(o => o.status === 'FILLED' || o.status === 'RECONCILED_CLOSED').length;
    
    return {
      totalVolume,
      filledOrders,
      activeBots: bots.filter(b => b.status === "RUNNING").length,
      totalBots: bots.length,
      lastOrderTime: orders[0]?.created_at || null
    };
  }

  private async stopAllBots() {
    console.warn('Stopping all bots due to risk event...');
    for (const [id, bot] of this.activeBots) {
      await bot.stop();
      this.activeBots.delete(id);
      db.prepare("UPDATE bots SET status = 'STOPPED' WHERE id = ?").run(id);
    }
  }

  private async enforceMarketSelection() {
    const selected = this.marketSelector.getSelectedSymbols();
    
    for (const [id, bot] of this.activeBots) {
      // @ts-ignore - Strategy objects have a symbol property
      const symbol = bot.symbol;
      if (!selected.includes(symbol)) {
        console.warn(`[MarketSelection] Symbol ${symbol} is no longer selected. Enforcing reduce-only mode.`);
        
        // 1. Cancel all open orders for this bot that are NOT reduce-only
        await this.hlClient.cancelAllOrders(); // Simple approach: cancel all, strategy will re-post if needed
        
        // 2. We should ideally signal the strategy to stop opening NEW positions
        // In this MVP, we'll just stop the bot if it's no longer allowed.
        // Or if we want to follow user instructions "allow reduce-only exits":
        // We'll trust the strategy's next tick will see the symbol is not selected if we inject that state.
        
        if (typeof bot.setReduceOnly === 'function') {
           bot.setReduceOnly(true);
        } else {
           // Fallback: just stop the bot
           console.log(`[MarketSelection] Stopping bot ${id} as it doesn't support reduce-only mode.`);
           await this.stopBot(id);
        }
      }
    }
  }

  private async reconcile() {
    console.log('[Reconciliation] Starting sync...');
    
    // 1. Sync Open Orders
    const hlOrders = await this.hlClient.getOpenOrders();
    const localOpenOrders = db.prepare("SELECT * FROM orders WHERE status = 'NEW'").all() as any[];

    for (const localOrder of localOpenOrders) {
      const existsOnHl = hlOrders.some((ho: any) => ho.oid.toString() === localOrder.hl_order_id);
      if (!existsOnHl) {
        // Order is no longer in open orders list on exchange
        // It's either FILLED or CANCELLED
        console.log(`[Reconciliation] Local order ${localOrder.id} (${localOrder.hl_order_id}) no longer open on HL.`);
        // Note: For a real app, we'd check fills to confirm.
        // For now, let's assume if it's gone from open orders, it might be filled if it's not cancelled.
        db.prepare("UPDATE orders SET status = 'RECONCILED_CLOSED' WHERE id = ?").run(localOrder.id);
      }
    }

    // 2. Sync Fills
    const hlFills = await this.hlClient.getUserFills();
    for (const fill of hlFills) {
      const exists = db.prepare("SELECT 1 FROM fills WHERE id = ?").get(fill.tid.toString());
      if (!exists) {
        // New fill detected!
        db.prepare(`
          INSERT INTO fills (id, order_id, price, size, fee, timestamp) 
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          fill.tid.toString(),
          fill.oid.toString(),
          fill.px,
          fill.sz,
          fill.fee,
          new Date(fill.time).toISOString()
        );
        
        // Also update the order status to FILLED if we find the order locally
        db.prepare("UPDATE orders SET status = 'FILLED' WHERE hl_order_id = ?").run(fill.oid.toString());
      }
    }

    // 3. Sync Account State (Positions)
    // Account state is fetched directly by the frontend usually, but we could snapshot it
    const accountState = await this.hlClient.getAccountState();
    // Potentially update a positions table if we had one, or use it for risk checks
    
    this.lastReconciliation = new Date().toISOString();
    console.log(`[Reconciliation] Sync complete. Open Orders: ${hlOrders.length}, Fills Processed.`);
  }
}
