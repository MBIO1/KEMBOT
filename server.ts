import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { HyperliquidClient } from './src/backend/exchange/hyperliquidClient';
import { BotManager } from './src/backend/strategies/BotManager';
import { config } from './src/backend/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = 3000;
  const hlClient = new HyperliquidClient();
  const botManager = new BotManager(hlClient);

  app.use(express.json());

  // API Auth Middleware
  const API_TOKEN = process.env.API_AUTH_TOKEN;
  app.use('/api', (req: any, res: any, next: any) => {
    if (!API_TOKEN) return next();
    const provided = req.headers['x-api-key'];
    if (provided !== API_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // API Routes
  app.get('/api/status', (req, res) => {

    res.json({ status: 'online', version: '1.5.0', engine: 'AlphaQuant Core' });
  });

  app.get('/api/trading/config', (req, res) => {
    res.json({
      testnet: config.testnet,
      dryRun: config.dryRun,
      liveTrading: config.liveTrading,
      walletConfigured: Boolean(config.walletAddress || config.privateKey),
      privateKeyConfigured: Boolean(config.privateKey),
      infoUrl: config.infoUrl,
      exchangeUrl: config.exchangeUrl,
    });
  });

  app.get('/api/account/summary', (req, res) => {
    res.json({
      balance: 14290.44,
      drawdown: 0.12,
      leverage: 2.1,
      liqPrice: 58401.50,
      activePositions: 3
    });
  });

  app.get('/api/market/meta', async (req, res) => {
    try {
      const meta = await hlClient.getMeta();
      res.json(meta);
    } catch (error: any) {
      res.status(502).json({ error: 'Upstream connection failed' });
    }
  });

  app.get('/api/market/prices', async (req, res) => {
    try {
      const prices = await hlClient.getAllMids();
      res.json(prices);
    } catch (error: any) {
      res.status(502).json({ error: 'Upstream connection failed' });
    }
  });

  app.get('/api/updates/github', async (req, res) => {
    try {
      const response = await fetch("https://api.github.com/repos/hyperliquid-dex/hyperliquid-python-sdk/commits?per_page=5", {
        headers: { 'User-Agent': 'AlphaQuant-App' }
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(502).json({ error: 'GitHub API unreachable' });
    }
  });

  app.post('/api/telegram/test', async (req, res) => {
    const { token, chatId, message } = req.body;
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message || " AlphaQuant Relay Heartbeat: System Verified",
          parse_mode: 'Markdown'
        })
      });
      const data = await response.json();
      if (data.ok) {
        res.json({ success: true });
      } else {
        res.status(400).json({ success: false, error: data.description });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/bots/dca', (req, res) => {
    botManager.startDCA('BTC', req.body);
    res.json({ success: true, message: 'DCA Bot started on BTC' });
  });

  app.post('/api/bots/grid', (req, res) => {
    botManager.startGrid('BTC', req.body);
    res.json({ success: true, message: 'Grid Bot started on BTC' });
  });

  app.post('/api/bots/dca/stop', (req, res) => {
    botManager.stopDCA('BTC');
    res.json({ success: true, message: 'DCA Bot stopped' });
  });

  app.post('/api/bots/grid/stop', (req, res) => {
    botManager.stopGrid('BTC');
    res.json({ success: true, message: 'Grid Bot stopped' });
  });

  app.get('/api/bots', (req, res) => {
    res.json(botManager.getBots());
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const runningBots = botManager.getRunningBotsCount();
      const maxBots = botManager.getTotalBotsCount() || 5;

      const r = {
        equity: 10482.50,
        unrealizedTotal: 542.80 + (runningBots * 10.5), // fake update based on running bots
        filled: 42 + runningBots,
        totalOrders: 45 + runningBots,
        runningBots: runningBots,
        totalBots: Math.max(maxBots, 5),
      };
      res.json(r);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/pnl', (req, res) => {
    // Mock Pnl Data since db.prepare doesn't exist
    const mockPnl = [
      { name: "00:00", pnl: 0 },
      { name: "04:00", pnl: 12 },
      { name: "08:00", pnl: -5 },
      { name: "12:00", pnl: 25 },
      { name: "16:00", pnl: 48 },
      { name: "20:00", pnl: 32 },
      { name: "23:59", pnl: 54 },
    ];
    res.json(mockPnl);
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Server] AlphaQuant Engine running at http://0.0.0.0:${port}`);
  });
}

startServer();
