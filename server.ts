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
    try {
      const bots = db.prepare("SELECT * FROM bots").all();
      res.json(bots);
    } catch (e: any) {
      console.error("[Server] GET /api/bots error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/bots", (req, res) => {
    try {
      const { name, strategy, symbol, config } = req.body;
      const id = Math.random().toString(36).substring(7);
      db.prepare("INSERT INTO bots (id, name, strategy, symbol, status, config) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, name, strategy, symbol, 'STOPPED', JSON.stringify(config));
      res.json({ id });
    } catch (e: any) {
      console.error("[Server] POST /api/bots error:", e.message);
      res.status(500).json({ error: e.message });
    }
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

  app.get("/api/account", async (req, res) => {
    try {
      const state = await hlClient.getAccountState();
      res.json({
        withdrawable: state.withdrawable || "0",
        accountValue: state.crossMarginSummary?.accountValue || "0",
        totalMarginUsed: state.crossMarginSummary?.totalMarginUsed || "0",
        totalMaintenanceMarginUsed: state.crossMarginSummary?.totalMaintenanceMarginUsed || "0",
        positions: state.assetPositions || []
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/markets/selected", (req, res) => {
    res.json(botManager.getSystemStatus().marketSelection.selected);
  });

  app.get("/api/markets/rankings", (req, res) => {
    res.json(botManager.getMarketRankings());
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
      if (!Array.isArray(data) || data.length < 2) {
        console.error("[Server] Unexpected format from getMetaAndAssetCtxs:", data);
        return res.json([]);
      }
      const universe = data[0].universe || [];
      const ctxs = data[1] || [];
      const markets = universe.map((asset: any, index: number) => {
        const ctx = ctxs[index];
        const midPx = parseFloat(ctx?.midPx || "0");
        const prevDayPx = parseFloat(ctx?.prevDayPx || "0");
        const dayChange = (midPx > 0 && prevDayPx > 0) ? ((midPx - prevDayPx) / prevDayPx) * 100 : 0;
        
        return {
          symbol: asset.name,
          price: ctx?.midPx || "0",
          dayChange: dayChange,
          volume: parseFloat(ctx?.dayNtlVlm || "0"),
          funding: ctx?.funding || "0",
          openInterest: ctx?.openInterest || "0",
          isStardust: asset.isStardust || false
        };
      });

      // Sort by volume descending to ensure "Hyper Lines" (most traded) come first
      markets.sort((a: any, b: any) => {
        const volA = isNaN(a.volume) ? 0 : a.volume;
        const volB = isNaN(b.volume) ? 0 : b.volume;
        return volB - volA;
      });

      // Return top 200 markets
      res.json(markets.slice(0, 200));
    } catch (e: any) {
      console.error("[Server] Market API error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/orders", (req, res) => {
    try {
      const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100").all();
      res.json(orders);
    } catch (e: any) {
      console.error("[Server] GET /api/orders error:", e.message);
      res.json([]); // Return empty list on error for stats
    }
  });

  app.get("/api/stats", (req, res) => {
    res.json(botManager.getGlobalStats());
  });

  app.get("/api/pnl-history", (req, res) => {
    try {
      const history = db.prepare("SELECT total_pnl as pnl, timestamp FROM pnl_snapshots ORDER BY timestamp ASC LIMIT 100").all();
      res.json(history.map((h: any) => ({
        name: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pnl: h.pnl
      })));
    } catch (e: any) {
      console.error("[Server] GET /api/pnl-history error:", e.message);
      res.json([]);
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { symbol, isBuy, price, size, reduceOnly } = req.body;
      const result = await hlClient.placeOrder({
        symbol,
        isBuy,
        price: parseFloat(price),
        size: parseFloat(size),
        reduceOnly: !!reduceOnly
      });

      if (result.status === "ok") {
        const hlOrderId = result.response?.data?.oid;
        const initialStatus = result.response?.data?.status === "filled" ? "FILLED" : "NEW";
        const side = isBuy ? "BUY" : "SELL";

        db.prepare(
          "INSERT INTO orders (id, bot_id, symbol, side, price, size, status, hl_order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          Math.random().toString(36).substring(7),
          "MANUAL",
          symbol,
          side,
          price,
          size,
          initialStatus,
          hlOrderId
        );
      }

      res.json(result);
    } catch (e: any) {
      console.error("Manual order error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/system/status", (req, res) => {
    res.json(botManager.getSystemStatus());
  });

  app.post("/api/backtest", async (req, res) => {
    const { strategy, symbol, config, backtestConfig } = req.body;
    try {
      const { BacktestEngine } = await import("./src/backend/backtest/backtestEngine.ts");
      const { GridStrategy } = await import("./src/backend/strategies/grid.ts");
      const { DCAStrategy } = await import("./src/backend/strategies/dca.ts");

      const engine = new BacktestEngine(backtestConfig);
      
      // Fetch historical data for backtest
      const candles = await hlClient.getCandles(symbol, "1m", Date.now() - 24 * 60 * 60 * 1000, Date.now());
      if (!Array.isArray(candles)) {
        console.error("Historical data fetch failed:", candles);
        throw new Error("Failed to fetch historical data for backtest. Exchange may be unresponsive.");
      }
      const data = candles.map((c: any) => ({ timestamp: c.t, price: parseFloat(c.c) }));

      let strat;
      if (strategy === "GRID") {
        strat = new GridStrategy("backtest", symbol, config);
      } else {
        strat = new DCAStrategy("backtest", symbol, config);
      }

      const results = await engine.run(strat, data);
      res.json(results);
    } catch (e: any) {
      console.error("Backtest error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/kill-switch", async (req, res) => {
    try {
      // 1. Stop all bots
      const bots = db.prepare("SELECT id FROM bots WHERE status = 'RUNNING'").all() as any[];
      for (const bot of bots) {
        await botManager.stopBot(bot.id);
      }
      // 2. In a real app: Cancel all orders & Market close all positions
      res.json({ status: "emergency_stop_triggered" });
    } catch (e: any) {
      console.error("[Server] Kill switch error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/system/reset-breaker", async (req, res) => {
    try {
      botManager.resetCircuitBreaker();
      res.json({ status: "ok" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
