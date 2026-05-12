import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initDb } from "./src/backend/db/session.ts";
import db from "./src/backend/db/session.ts";
import { config } from "./src/backend/config.ts";
import { BotManager } from "./src/backend/botManager.ts";
import { HyperliquidClient } from "./src/backend/exchange/hyperliquidClient.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Init DB and Bot Manager
  initDb();
  const botManager = new BotManager();
  await botManager.initFromDb();
  const hlClient = new HyperliquidClient();

  // API Routes
  app.get("/api/bots", (req, res) => {
    const bots = db.prepare("SELECT * FROM bots").all();
    res.json(bots);
  });

  app.post("/api/bots", (req, res) => {
    const { name, strategy, symbol, config } = req.body;
    const id = Math.random().toString(36).substring(7);
    db.prepare("INSERT INTO bots (id, name, strategy, symbol, status, config) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, name, strategy, symbol, 'STOPPED', JSON.stringify(config));
    res.json({ id });
  });

  app.post("/api/bots/:id/start", async (req, res) => {
    try {
      await botManager.startBot(req.params.id);
      res.json({ status: "ok" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/bots/:id/stop", async (req, res) => {
    try {
      await botManager.stopBot(req.params.id);
      res.json({ status: "ok" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/positions", async (req, res) => {
    try {
      const state = await hlClient.getAccountState();
      res.json(state.assetPositions || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/config", (req, res) => {
    res.json({
      testnet: config.testnet,
      wsUrl: config.testnet ? 'wss://api.hyperliquid-testnet.xyz/ws' : 'wss://api.hyperliquid.xyz/ws'
    });
  });

  app.get("/api/markets", async (req, res) => {
    try {
      const data = await hlClient.getMetaAndAssetCtxs();
      // data[0] is meta (universe), data[1] is ctxs
      const universe = data[0].universe;
      const ctxs = data[1];
      const markets = universe.map((asset: any, index: number) => {
        const ctx = ctxs[index];
        return {
          symbol: asset.name,
          price: ctx?.midPrice || "0",
          dayChange: ctx?.dayNtlVlm ? ((parseFloat(ctx.midPrice) - parseFloat(ctx.prevDayPrice)) / parseFloat(ctx.prevDayPrice)) * 100 : 0,
          volume: ctx?.dayNtlVlm || "0",
          isStardust: asset.isStardust || false
        };
      });
      res.json(markets);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/orders", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 50").all();
    res.json(orders);
  });

  app.post("/api/kill-switch", async (req, res) => {
    // 1. Stop all bots
    const bots = db.prepare("SELECT id FROM bots WHERE status = 'RUNNING'").all() as any[];
    for (const bot of bots) {
      await botManager.stopBot(bot.id);
    }
    // 2. In a real app: Cancel all orders & Market close all positions
    res.json({ status: "emergency_stop_triggered" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HyperQuant Server running on http://localhost:${PORT}`);
  });
}

startServer();
