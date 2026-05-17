import { HyperliquidClient } from "../exchange/hyperliquidClient";
import { WebsocketClient } from "../exchange/websocketClient";
import { DCAStrategy } from "./dca";
import { GridStrategy } from "./grid";

export class BotManager {
  private dcaBots: Record<string, DCAStrategy> = {};
  private gridBots: Record<string, GridStrategy> = {};
  private client: HyperliquidClient;
  private wsClient: WebsocketClient;
  private latestPrices: Record<string, number> = {};

  constructor(client: HyperliquidClient) {
    this.client = client;
    this.wsClient = new WebsocketClient();
    this.setupWebsocket();
  }

  private setupWebsocket() {
    this.wsClient.connect();
    this.wsClient.on('priceUpdate', async ({ symbol, price }) => {
      this.latestPrices[symbol] = price;
      
      // Drive strategy ticks with real-time price
      if (this.dcaBots[symbol] && this.dcaBots[symbol].status === 'RUNNING') {
        try {
          await this.dcaBots[symbol].tick(price);
        } catch(e) { /* ignore */ }
      }
      
      if (this.gridBots[symbol] && this.gridBots[symbol].status === 'RUNNING') {
        try {
          await this.gridBots[symbol].tick(price);
        } catch(e) { /* ignore */ }
      }
    });
  }

  startDCA(symbol: string, config: any) {
    if (!this.dcaBots[symbol]) {
      this.dcaBots[symbol] = new DCAStrategy(this.client, symbol);
    }
    this.dcaBots[symbol].start(config);
  }

  stopDCA(symbol: string) {
    if (this.dcaBots[symbol]) {
      this.dcaBots[symbol].stop();
    }
  }

  startGrid(symbol: string, config: any) {
    if (!this.gridBots[symbol]) {
      this.gridBots[symbol] = new GridStrategy(this.client, symbol);
    }
    this.gridBots[symbol].start(config);
  }

  stopGrid(symbol: string) {
    if (this.gridBots[symbol]) {
      this.gridBots[symbol].stop();
    }
  }

  getRunningBotsCount() {
    let count = 0;
    for (const bot of Object.values(this.dcaBots)) {
      if (bot.status === 'RUNNING') count++;
    }
    for (const bot of Object.values(this.gridBots)) {
      if (bot.status === 'RUNNING') count++;
    }
    return count;
  }

  getTotalBotsCount() {
    return Object.keys(this.dcaBots).length + Object.keys(this.gridBots).length;
  }

  getBots() {
    return {
      dca: Object.fromEntries(Object.entries(this.dcaBots).map(([sym, bot]) => [sym, { status: bot.status, config: (bot as any).config }])),
      grid: Object.fromEntries(Object.entries(this.gridBots).map(([sym, bot]) => [sym, { status: bot.status, config: (bot as any).config }]))
    };
  }

  getLatestPrices() {
    return this.latestPrices;
  }
}