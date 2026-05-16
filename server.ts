import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { HyperliquidClient } from './src/backend/exchange/hyperliquidClient';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = 3000;
  const hlClient = new HyperliquidClient();

  app.use(express.json());

  // API Routes
  app.get('/api/status', (req, res) => {
    res.json({ status: 'online', version: '1.5.0', engine: 'AlphaQuant Core' });
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
