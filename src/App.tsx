import React, { useState, useEffect, useRef } from "react";
import { 
  BarChart3, 
  Activity, 
  Wallet, 
  AlertTriangle, 
  Play, 
  Square, 
  Plus, 
  RefreshCcw,
  LayoutDashboard,
  History,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Cpu,
  Layers,
  Search,
  Bell,
  Settings,
  Trash2,
  X,
  Zap
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { motion, AnimatePresence } from "motion/react";

// Live PnL history will be fetched from API
export default function App() {
  const [account, setAccount] = useState<any>(null);
  const [bots, setBots] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pnlHistory, setPnlHistory] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketSearch, setMarketSearch] = useState("");
  const [marketSort, setMarketSort] = useState<"volume" | "change" | "symbol">("volume");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [backtestResults, setBacktestResults] = useState<any>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestConfig, setBacktestConfig] = useState({
    feeRate: 0.0001,
    slippage: 0.0001,
    latencyMs: 100,
    startBalance: 10000
  });
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [toasts, setToasts] = useState<any[]>([]);
  const prevBots = useRef<any[]>([]);
  const prevOrders = useRef<any[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    // Alert for bot status changes
    if (prevBots.current.length > 0) {
      bots.forEach(bot => {
        const prevBot = prevBots.current.find(pb => pb.id === bot.id);
        if (prevBot && prevBot.status !== bot.status) {
          addToast(`Bot '${bot.name}' status changed to ${bot.status}`, 
            bot.status === 'ERROR' ? 'error' : 'success' 
          );
        }
      });
    }
    prevBots.current = bots;
  }, [bots]);

  useEffect(() => {
    // Alert for new filled orders
    if (prevOrders.current.length > 0) {
      const newFilled = orders.filter(order => 
        !prevOrders.current.find(po => po.id === order.id) && order.status === 'FILLED'
      );
      
      newFilled.forEach(order => {
        addToast(`${order.side} EXECUTION: ${order.size} ${order.symbol} @ $${order.price}`, 'success');
      });
    }
    prevOrders.current = orders;
  }, [orders]);

  const currentPnl = account && systemStatus ? (parseFloat(account.accountValue) - systemStatus.circuitBreaker.initialEquity) : 0;
  const currentPnlPct = systemStatus?.circuitBreaker?.initialEquity ? (currentPnl / systemStatus.circuitBreaker.initialEquity) * 100 : 0;

  const [botForm, setBotForm] = useState({
    name: "",
    strategy: "DCA",
    symbol: "BTC",
    config: {
      intervalMinutes: 60,
      sizeUsd: 10,
      upperPrice: 4000,
      lowerPrice: 3000,
      numGrids: 10,
      sizePerGrid: 0.1,
      tp: "" as string | number,
      sl: "" as string | number
    }
  });

  const fetchData = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const fetchJson = async (url: string, fallback: any = { error: 'Unknown error' }) => {
        try {
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (err: any) {
          if (err.name === 'AbortError') return { error: 'Timeout' };
          return fallback instanceof Array ? [] : { ...fallback, error: err.message };
        }
      };

      const [botsRes, ordersRes, accRes, marketRes, systemRes, statsRes, pnlRes] = await Promise.all([
        fetchJson("/api/bots", []),
        fetchJson("/api/orders", []),
        fetchJson("/api/account", { error: true }),
        fetchJson("/api/markets", []),
        fetchJson("/api/system/status", { error: true }),
        fetchJson("/api/stats", {}),
        fetchJson("/api/pnl-history", [])
      ]);

      clearTimeout(timeout);
      
      if (botsRes.error || ordersRes.error || accRes.error || marketRes.error || systemRes.error) {
        console.warn("Sync warnings:", { botsRes, ordersRes, accRes, marketRes, systemRes });
      }

      setBots(Array.isArray(botsRes) ? botsRes : []);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setAccount(accRes.error ? null : accRes);
      setPositions(accRes.positions || []);
      setSystemStatus(systemRes.error ? null : systemRes);
      setGlobalStats(statsRes);
      setPnlHistory(Array.isArray(pnlRes) ? pnlRes : []);
      
      if (Array.isArray(marketRes)) {
        setMarkets(prev => {
          if (prev.length === 0) return marketRes;
          const priceMap = new Map(prev.map(m => [m.symbol, m.price]));
          return marketRes.map(m => ({
            ...m,
            price: priceMap.get(m.symbol) || m.price
          }));
        });
      }
    } catch (e: any) {
      console.error("Fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem("hyperquant_presets");
      if (savedPresets) setPresets(JSON.parse(savedPresets));
    } catch (e) {
      console.warn("Failed to load presets from localStorage", e);
    }
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResetBreaker = async () => {
    try {
      const res = await fetch("/api/system/reset-breaker", { method: "POST" });
      if (res.ok) {
        addToast("Circuit breaker has been manually reset.", "success");
        fetchData();
      }
    } catch (e) {
      addToast("Failed to reset safeguard.", "error");
    }
  };

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let reconnectAttempts = 0;

    const setupWS = async () => {
      try {
        const configRes = await fetch("/api/config");
        if (!configRes.ok) return;
        const config = await configRes.json();

        ws = new WebSocket(config.wsUrl);

        ws.onopen = () => {
          console.log("Hyperliquid WS Connected");
          reconnectAttempts = 0;
          ws?.send(JSON.stringify({
            method: "subscribe",
            subscription: { type: "allMids" }
          }));
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.channel === "allMids") {
            const mids = msg.data.mids;
            setMarkets(prev => prev.map(m => {
              if (mids[m.symbol]) {
                return { ...m, price: mids[m.symbol] };
              }
              return m;
            }));
          }
        };

        ws.onclose = () => {
          console.log("WebSocket Closed, attempting reconnect...");
          const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
          reconnectAttempts++;
          reconnectTimeout = setTimeout(setupWS, delay);
        };

        ws.onerror = (err) => {
          console.error("WebSocket Error:", err);
          ws?.close();
        };
      } catch (err) {
        console.error("Failed to setup WebSocket:", err);
        const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
        reconnectAttempts++;
        reconnectTimeout = setTimeout(setupWS, delay);
      }
    };

    setupWS();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleStartBot = async (id: string) => {
    try {
      const res = await fetch(`/api/bots/${id}/start`, { method: "POST" });
      if (res.ok) {
        addToast("Strategy deployed successfully.", "success");
        fetchData();
      } else {
        throw new Error("Activation failed");
      }
    } catch (e) {
      addToast("Failed to start bot.", "error");
    }
  };

  const handleStopBot = async (id: string) => {
    try {
      const res = await fetch(`/api/bots/${id}/stop`, { method: "POST" });
      if (res.ok) {
        addToast("Strategy stopped manually.", "success");
        fetchData();
      } else {
        throw new Error("Deactivation failed");
      }
    } catch (e) {
      addToast("Failed to stop bot.", "error");
    }
  };

  const handleKillSwitch = async () => {
    if (confirm("EMERGENCY: Stop all bots and cancel all activity?")) {
      try {
        const res = await fetch("/api/kill-switch", { method: "POST" });
        if (res.ok) {
          addToast("EMERGENCY STOP EXECUTED", "error");
          fetchData();
        }
      } catch (e) {
        addToast("Kill switch failed. Use manual deactivation.", "error");
      }
    }
  };

  const openCreateModal = () => {
    setBotForm({
      name: "",
      strategy: "DCA",
      symbol: "BTC",
      config: {
        intervalMinutes: 60,
        sizeUsd: 10,
        upperPrice: 4000,
        lowerPrice: 3000,
        numGrids: 10,
        sizePerGrid: 0.1,
        tp: "",
        sl: ""
      }
    });
    setIsModalOpen(true);
  };

  const openOrderModal = () => {
    setIsOrderModalOpen(true);
  };

  const handleManualOrder = async (orderData: any) => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (data.status === "ok") {
        addToast(
          `Manual ${orderData.isBuy ? "BUY" : "SELL"} order placed successfully.`,
          "success"
        );
        fetchData();
      } else {
        addToast(`Order failed: ${data.message || "Unknown error"}`, "error");
      }
    } catch (e) {
      addToast("Order execution failed.", "error");
    }
  };

  const validateForm = (data = botForm) => {
    const { strategy, symbol, config } = data;
    
    if (!symbol) {
      addToast("Asset selection is required.", "error");
      return false;
    }

    if (strategy === "DCA") {
      if (!config.intervalMinutes || Number(config.intervalMinutes) <= 0) {
        addToast("Interval must be a positive number.", "error");
        return false;
      }
      if (!config.sizeUsd || Number(config.sizeUsd) <= 0) {
        addToast("Trade size (USD) must be positive.", "error");
        return false;
      }
    } else if (strategy === "GRID") {
      const upper = Number(config.upperPrice);
      const lower = Number(config.lowerPrice);
      const grids = Number(config.numGrids);
      const size = Number(config.sizePerGrid);

      if (!config.lowerPrice || lower <= 0) {
        addToast("Lower price must be positive.", "error");
        return false;
      }
      if (!config.upperPrice || upper <= lower) {
        addToast("Upper price must be strictly greater than lower price.", "error");
        return false;
      }
      if (!config.numGrids || grids <= 0) {
        addToast("Number of grids must be positive.", "error");
        return false;
      }
      if (!config.sizePerGrid || size <= 0) {
        addToast("Size per grid must be positive.", "error");
        return false;
      }
    }

    if (config.tp && Number(config.tp) <= 0) {
      addToast("Take Profit must be a positive percentage.", "error");
      return false;
    }
    if (config.sl && Number(config.sl) <= 0) {
      addToast("Stop Loss must be a positive percentage.", "error");
      return false;
    }

    return true;
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const { strategy, symbol, config, name } = botForm;
    const finalName = name || `${strategy} ${symbol}`;

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          strategy,
          symbol,
          config: {
            ...(strategy === "DCA" 
              ? { intervalMinutes: Number(config.intervalMinutes), sizeUsd: Number(config.sizeUsd) }
              : { 
                  upperPrice: Number(config.upperPrice), 
                  lowerPrice: Number(config.lowerPrice), 
                  numGrids: Number(config.numGrids), 
                  sizePerGrid: Number(config.sizePerGrid) 
                }),
            tp: config.tp ? Number(config.tp) : null,
            sl: config.sl ? Number(config.sl) : null
          }
        })
      });
      
      if (res.ok) {
        addToast("New bot created and ready for deployment.", "success");
        setIsModalOpen(false);
        fetchData();
      } else {
        throw new Error("Failed to create bot");
      }
    } catch (e) {
      addToast("Bot creation failed.", "error");
    }
  };

  const [presetNameInput, setPresetNameInput] = useState("");
  const [showPresetNaming, setShowPresetNaming] = useState(false);

  const saveAsPreset = () => {
    if (!validateForm()) return;
    if (!presetNameInput) {
      setShowPresetNaming(true);
      const defaultName = botForm.name || `${botForm.strategy} ${botForm.symbol} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      setPresetNameInput(defaultName);
      return;
    }

    const newPresets = [...presets, { ...botForm, presetName: presetNameInput, id: Date.now() }];
    setPresets(newPresets);
    localStorage.setItem("hyperquant_presets", JSON.stringify(newPresets));
    addToast(`Config '${presetNameInput}' saved to library.`, "success");
    setPresetNameInput("");
    setShowPresetNaming(false);
  };

  const deletePreset = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPresets = presets.filter(p => p.id !== id);
    setPresets(newPresets);
    localStorage.setItem("hyperquant_presets", JSON.stringify(newPresets));
    addToast("Preset removed.", "success");
  };

  const applyPreset = (preset: any) => {
    if (!validateForm(preset)) return;
    setBotForm({ ...preset, name: preset.presetName || "" });
    addToast(`Preset applied: ${preset.presetName || preset.strategy}`, "success");
  };

  const runBacktest = async () => {
    setBacktestLoading(true);
    setBacktestResults(null); 
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy: botForm.strategy,
          symbol: botForm.symbol,
          config: botForm.config,
          backtestConfig: {
            ...backtestConfig,
            symbol: botForm.symbol
          }
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Simulation failed");
      }
      
      setBacktestResults(data);
      addToast("Backtest completed successfully.", "success");
    } catch (e: any) {
      addToast(e.message || "Backtest execution failed.", "error");
    } finally {
      setBacktestLoading(false);
    }
  };

  const initializeQuickBot = async (symbol: "BTC" | "ETH") => {
    const defaultData = {
      name: `QUICK_${symbol}_DCA`,
      strategy: "DCA",
      symbol,
      config: {
        intervalMinutes: 60,
        sizeUsd: 10,
        tp: null,
        sl: null
      }
    };

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaultData)
      });
      
      if (res.ok) {
        const bot = await res.json();
        addToast(`${symbol} DCA bot initialized. Activating...`, "success");
        handleStartBot(bot.id);
      } else {
        const err = await res.json();
        addToast(`Initialization failed: ${err.error || "Unknown error"}`, "error");
      }
    } catch (e) {
      addToast(`Failed to initialize ${symbol} bot.`, "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-[#0A0C10] border-b border-white/5 p-4 flex justify-between items-center z-[50]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500 flex items-center justify-center rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.3)]">
            <Activity size={16} className="text-black" />
          </div>
          <h1 className="font-black text-sm tracking-tighter text-white leading-tight uppercase">Hyperquant</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Zap size={24} />}
        </button>
      </div>

      {/* Glass Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#0A0C10] border-r border-white/5 flex flex-col transition-transform duration-300 transform
        lg:translate-x-0 lg:static 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
        
        <div className="p-8 relative">
          <div className="hidden lg:flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-cyan-500 flex items-center justify-center rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <Activity size={20} className="text-black" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tighter text-white leading-tight">HYPERQUANT</h1>
              <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/50 font-bold">Terminal v1.2</div>
            </div>
          </div>

          <nav className="space-y-1">
            <SidebarLink icon={<LayoutDashboard size={18} />} label="Mission Control" active={activeTab === "dashboard"} onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }} />
            <SidebarLink icon={<TrendingUp size={18} />} label="Market Directory" active={activeTab === "markets"} onClick={() => { setActiveTab("markets"); setIsSidebarOpen(false); }} />
            <SidebarLink icon={<Cpu size={18} />} label="Backtest Lab" active={activeTab === "backtest"} onClick={() => { setActiveTab("backtest"); setIsSidebarOpen(false); }} />
            <SidebarLink icon={<Layers size={18} />} label="Bot Registry" active={activeTab === "strategies"} onClick={() => { setActiveTab("strategies"); setIsSidebarOpen(false); }} />
            <SidebarLink icon={<History size={18} />} label="Trade Ledger" active={activeTab === "history"} onClick={() => { setActiveTab("history"); setIsSidebarOpen(false); }} />
            <SidebarLink icon={<Settings size={18} />} label="Network Config" active={false} onClick={() => {}} />
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/5 bg-black/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          
          <div className="space-y-4">
              <div className="p-4 bg-slate-900/40 rounded-xl border border-white/5 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest flex items-center gap-1.5 uppercase">
                    <Wallet size={12} className="text-cyan-500" />
                    Portfolio Value
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Live</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">
                  ${parseFloat(account?.accountValue || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Withdrawable</span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">
                    ${parseFloat(account?.withdrawable || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-cyan-500 h-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (parseFloat(account?.totalMarginUsed || "0") / parseFloat(account?.accountValue || "1")) * 100)}%` }} 
                  />
                </div>
              </div>

            <button 
              onClick={handleKillSwitch}
              className="w-full group relative overflow-hidden bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 py-4 rounded-xl transition-all duration-300"
            >
              <div className="relative z-10 flex items-center justify-center gap-2 text-rose-500 font-black text-xs tracking-widest italic group-hover:scale-105 transition-transform">
                <ShieldAlert size={16} />
                PROTOCOL KILL SWITCH
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/5 to-rose-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 overflow-y-auto relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-rose-500/5 pointer-events-none" />
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-[#050608]/80 backdrop-blur-md border-b border-white/5 px-4 lg:px-10 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div>
              <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight uppercase italic">{activeTab === "dashboard" ? "Dashboard" : activeTab.replace(/([A-Z])/g, ' $1')}</h2>
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${systemStatus?.websocket?.healthy ? 'bg-cyan-500 animate-pulse' : 'bg-rose-500'} shadow-[0_0_8px_rgba(34,211,238,0.8)]`} />
                  WS: {systemStatus?.websocket?.healthy ? 'Healthy' : 'Disconnected'}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${systemStatus?.circuitBreaker?.triggered ? 'bg-rose-500 animate-bounce' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(16,185,129,0.8)]`} />
                  Safeguard: {systemStatus?.circuitBreaker?.triggered ? 'TRIAGED' : 'ARMED'}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${systemStatus?.reconciliation?.inProgress ? 'bg-amber-500 animate-spin' : 'bg-slate-700'}`} />
                  Sync: {systemStatus?.reconciliation?.lastRun ? new Date(systemStatus.reconciliation.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
                </div>
              </div>
            </div>
            
            <div className="h-8 w-[1px] bg-white/10" />
            
            <div className="hidden sm:flex gap-4">
              <HeaderQuickStat label="Active Streams" value="4" />
              <HeaderQuickStat label="Network Status" value="Healthy" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
             <div className="relative group flex-1 md:flex-none">
               <input 
                 type="text" 
                 placeholder="Search assets..." 
                 className="bg-white/5 border border-white/10 rounded-full px-5 py-2 text-xs w-full md:w-64 focus:md:w-80 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-slate-600 font-medium"
               />
               <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
             </div>
             
             <button className="p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors relative">
               <Bell size={18} />
               <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-500 rounded-full border-2 border-[#050608]" />
             </button>

             <div className="flex gap-2 w-full md:w-auto">
               <button 
                  onClick={openOrderModal}
                  className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 lg:px-6 py-2.5 rounded-xl font-black text-[10px] lg:text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  <Activity size={16} />
                  ORDER
                </button>

               <button 
                  onClick={openCreateModal}
                  className="flex-1 md:flex-none bg-cyan-500 hover:bg-cyan-400 text-black px-4 lg:px-6 py-2.5 rounded-xl font-black text-[10px] lg:text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(34,211,238,0.2)]"
                >
                  <Plus size={16} />
                  CREATE
                </button>
             </div>
          </div>
        </header>

        <section className="p-4 lg:p-10 pb-32 relative z-10">
          {systemStatus?.circuitBreaker?.triggered && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mb-8 p-6 bg-rose-500/10 border border-rose-500/30 rounded-3xl flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                  <ShieldAlert className="text-white" />
                </div>
                <div>
                  <h3 className="text-rose-500 font-black tracking-tighter uppercase italic text-lg">System Lockdown Active</h3>
                  <p className="text-rose-500/60 text-[10px] font-bold uppercase tracking-widest">Drawdown threshold exceeded. All bots halted and orders purged.</p>
                </div>
              </div>
              <button 
                onClick={handleResetBreaker}
                className="bg-rose-500 text-white px-6 py-2.5 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-rose-400 transition-all"
              >
                Reset Safeguard
              </button>
            </motion.div>
          )}

          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-md">
            <AnimatePresence mode="popLayout">
              {toasts.map((t) => (
                <motion.div 
                  key={t.id}
                  initial={{ opacity: 0, y: -40, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                  layout
                  className={`pointer-events-auto w-full px-6 py-4 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.7)] border flex items-center gap-5 backdrop-blur-2xl relative overflow-hidden group ${
                    t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100' : 'bg-rose-500/10 border-rose-500/20 text-rose-100'
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div className={`p-2 rounded-lg ${t.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {t.type === 'success' ? <Activity size={18} /> : <AlertTriangle size={18} />}
                  </div>
                  <div className="flex-1 flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 opacity-50">
                       {t.type === 'success' ? 'Core Execution Logic' : 'System Guard Alert'}
                     </span>
                     <span className="text-xs font-black italic tracking-tight leading-tight uppercase group-hover:text-white transition-colors">{t.message}</span>
                  </div>
                  <button onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))} className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0 text-slate-500">
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {activeTab === "markets" && (
            <div className="bg-[#0A0C10] rounded-3xl border border-white/5 overflow-hidden">
               <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-cyan-500/5 to-transparent">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-500 mb-1">Hyperliquid Global Assets</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none italic">Verified tradeable perpetual pairs in the universe</p>
                  </div>
                  <div className="flex gap-4 items-center">
                     <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Search assets..." 
                          value={marketSearch}
                          onChange={(e) => setMarketSearch(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-xs w-64 focus:w-80 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-slate-600 font-medium"
                        />
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                     </div>
                  </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-black/20 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                        <th className="px-10 py-6">Instrument</th>
                        <th className="px-10 py-6 text-right">Mid Price</th>
                        <th className="px-10 py-6 text-right">24h Change</th>
                        <th className="px-10 py-6 text-right">Open Interest</th>
                        <th className="px-10 py-6 text-right">Funding Rate</th>
                        <th className="px-10 py-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {markets
                        .filter(m => m.symbol.toLowerCase().includes(marketSearch.toLowerCase()))
                        .sort((a, b) => {
                          const oiA = parseFloat(a.openInterest || "0") || 0;
                          const oiB = parseFloat(b.openInterest || "0") || 0;
                          return oiB - oiA;
                        })
                        .map((market, i) => (
                        <motion.tr 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          key={market.symbol} 
                          className="hover:bg-white/5 transition-colors group"
                        >
                          <td className="px-10 py-6">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-400/20 transition-all font-mono italic">
                                   {market.symbol.slice(0, 2)}
                                </div>
                                <div className="flex flex-col">
                                   <span className="text-sm font-black text-white italic group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{market.symbol}</span>
                                   <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest italic">Hyperliquid Perp</span>
                                </div>
                             </div>
                          </td>
                          <td className="px-10 py-6 text-right font-mono text-white font-black text-sm">
                            ${parseFloat(market.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`px-10 py-6 text-right font-mono font-black text-xs italic ${(market.dayChange || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {(market.dayChange || 0) >= 0 ? '+' : ''}{(market.dayChange || 0).toFixed(2)}%
                          </td>
                          <td className="px-10 py-6 text-right font-mono text-slate-400 font-bold text-xs">
                            ${((parseFloat(market.openInterest || "0") * parseFloat(market.price || "0")) / 1000000).toFixed(1)}M
                          </td>
                          <td className={`px-10 py-6 text-right font-mono font-black text-[10px] ${(parseFloat(market.funding || "0") || 0) >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                            {((parseFloat(market.funding || "0") || 0) * 100).toFixed(4)}%
                          </td>
                          <td className="px-10 py-6 text-right">
                             <button 
                               onClick={() => {
                                 setBotForm(f => ({ ...f, symbol: market.symbol }));
                                 setIsModalOpen(true);
                               }}
                               className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all uppercase tracking-widest italic"
                             >
                               Deploy
                             </button>
                          </td>
                        </motion.tr>
                      ))}
                      {markets.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-10 py-32 text-center text-slate-700 italic font-medium uppercase tracking-[0.2em] text-xs">Initialising global asset discovery...</td>
                        </tr>
                      )}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === "backtest" && (
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-500 mb-8 font-mono">Simulation Parameters</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Starting Capital (USD)</label>
                      <input 
                        type="number"
                        value={backtestConfig.startBalance}
                        onChange={(e) => setBacktestConfig(c => ({ ...c, startBalance: parseFloat(e.target.value) }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-cyan-500/30 transition-all font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Fee Rate (e.g. 0.0002)</label>
                        <input 
                          type="number"
                          step="0.00001"
                          value={backtestConfig.feeRate}
                          onChange={(e) => setBacktestConfig(c => ({ ...c, feeRate: parseFloat(e.target.value) }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-cyan-500/30 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Slippage (e.g. 0.0001)</label>
                        <input 
                          type="number"
                          step="0.00001"
                          value={backtestConfig.slippage}
                          onChange={(e) => setBacktestConfig(c => ({ ...c, slippage: parseFloat(e.target.value) }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-cyan-500/30 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Simulation Latency (ms)</label>
                      <input 
                        type="number"
                        value={backtestConfig.latencyMs}
                        onChange={(e) => setBacktestConfig(c => ({ ...c, latencyMs: parseInt(e.target.value) }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-cyan-500/30 transition-all font-mono"
                      />
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Target Strategy</h4>
                      <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
                         <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-black text-white italic">{botForm.strategy} on {botForm.symbol}</span>
                            <span className="text-[10px] font-black text-cyan-400 uppercase">Selected</span>
                         </div>
                         <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Uses current configuration in Bot Registry</p>
                      </div>
                    </div>

                    <button 
                      onClick={runBacktest}
                      disabled={backtestLoading}
                      className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black rounded-2xl font-black text-xs tracking-widest uppercase transition-all shadow-[0_10px_30px_rgba(34,211,238,0.2)] disabled:opacity-50"
                    >
                      {backtestLoading ? <RefreshCcw className="animate-spin mx-auto" /> : "Initiate Simulation Loop"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-8 space-y-8">
                {backtestResults && backtestResults.history ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-5 gap-4">
                       <BentoStat label="Net PnL" value={`$${(backtestResults.pnl || 0).toFixed(2)}`} delta={`${(backtestResults.pnlPct || 0).toFixed(2)}%`} icon={<TrendingUp />} color={(backtestResults.pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400"} />
                       <BentoStat label="Final Balance" value={`$${(backtestResults.finalEquity || 0).toFixed(2)}`} delta="Post-simulation" icon={<Wallet />} />
                       <BentoStat label="Total Trades" value={backtestResults.trades || 0} delta="Executions" icon={<Activity />} />
                       <BentoStat label="Total Fees" value={`$${(backtestResults.totalFees || 0).toFixed(2)}`} delta="Exchange Cost" icon={<Layers />} />
                       <BentoStat label="Slippage" value={`$${(backtestResults.totalSlippage || 0).toFixed(2)}`} delta="Impact Loss" icon={<RefreshCcw />} />
                    </div>

                    <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8">
                       <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Simulation Log</h3>
                       <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                          {(backtestResults.history || []).map((order: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                               <div className="flex items-center gap-4">
                                  <span className={`w-2 h-2 rounded-full ${order.isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  <div>
                                     <div className="text-xs font-black text-white uppercase italic">{order.isBuy ? 'BUY' : 'SELL'} {order.size} {order.symbol}</div>
                                     <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Entry: ${order.price} | Fill: ${(order.fillPrice || 0).toFixed(2)}</div>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <div className="text-[10px] font-black text-white font-mono">Fee: ${(order.fee || 0).toFixed(4)}</div>
                                  <div className="text-[9px] font-bold text-slate-700 uppercase">{new Date(order.timestamp).toLocaleTimeString()}</div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-40 bg-[#0A0C10] rounded-3xl border border-white/5 border-dashed">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Activity className="text-slate-700" size={32} />
                      </div>
                      <h3 className="text-lg font-black text-white italic uppercase tracking-tight mb-2">Awaiting Simulation Task</h3>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-widest max-w-xs text-center leading-relaxed">Configure parameters and hit initiate to run a strategy backtest against historical data.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Bento Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                 <BentoStat 
                   label="Portfolio PnL" 
                   value={`${currentPnl >= 0 ? '+' : ''}$${currentPnl.toFixed(2)}`} 
                   delta={`${currentPnlPct >= 0 ? '+' : ''}${currentPnlPct.toFixed(2)}% Net Change`} 
                   icon={<TrendingUp className={currentPnl >= 0 ? "text-emerald-400" : "text-rose-400"} />} 
                   color={currentPnl >= 0 ? "text-emerald-400" : "text-rose-400"} 
                 />
                 <BentoStat label="Deployment Load" value={(bots || []).filter(b => b?.status === "RUNNING").length.toString()} delta={`Allocated of ${(bots || []).length}`} icon={<Cpu className="text-cyan-400" />} />
                 <BentoStat label="Asset Exposure" value={(positions || []).length.toString()} delta="Active Markets" icon={<Layers className="text-violet-400" />} />
                 <BentoStat label="Terminal Vol" value={`$${(globalStats?.totalVolume || 0).toLocaleString()}`} delta={`${globalStats?.filledOrders || 0} executions`} icon={<Activity className="text-slate-400" />} />
              </div>

              {/* Risk Management Command Center */}
              <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-6 lg:p-8 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 text-rose-500/5 group-hover:text-rose-500/10 transition-colors pointer-events-none">
                    <ShieldAlert size={160} />
                 </div>
                 
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 relative z-10">
                    <div>
                       <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Risk Management Protocol</h3>
                       <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${systemStatus?.circuitBreaker?.triggered ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${systemStatus?.circuitBreaker?.triggered ? 'text-rose-500' : 'text-emerald-500'}`}>
                             {systemStatus?.circuitBreaker?.triggered ? 'CIRCUIT BREAKER: TRIGGERED' : 'SYSTEM STATUS: NOMINAL'}
                          </span>
                       </div>
                    </div>
                    {systemStatus?.circuitBreaker?.triggered && (
                      <button 
                        onClick={handleResetBreaker}
                        className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_4px_15px_rgba(244,63,94,0.3)]"
                      >
                        Reset Safeguard
                      </button>
                    )}
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-12 relative z-10">
                    <div className="col-span-2 md:col-span-1 space-y-2">
                       <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Total Drawdown</span>
                          <span className={`text-xs font-black font-mono ${(systemStatus?.circuitBreaker?.currentDrawdown || 0) > (systemStatus?.circuitBreaker?.maxDrawdown || 0.05) * 0.8 ? 'text-rose-500' : 'text-white'}`}>
                             {((systemStatus?.circuitBreaker?.currentDrawdown || 0) * 100).toFixed(2)}%
                          </span>
                       </div>
                       <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, ((systemStatus?.circuitBreaker?.currentDrawdown || 0) / (systemStatus?.circuitBreaker?.maxDrawdown || 0.05)) * 100)}%` }}
                            className={`h-full transition-all duration-1000 ${
                              (systemStatus?.circuitBreaker?.currentDrawdown || 0) > (systemStatus?.circuitBreaker?.maxDrawdown || 0.05) * 0.7 
                                ? 'bg-gradient-to-r from-rose-500 to-rose-400' 
                                : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                            }`}
                          />
                       </div>
                       <div className="flex justify-between text-[9px] font-bold text-slate-700 uppercase tracking-tighter">
                          <span>Initial: ${(systemStatus?.circuitBreaker?.initialEquity || 0).toLocaleString()}</span>
                          <span>Soft Cap: {((systemStatus?.circuitBreaker?.maxDrawdown || 0.05) * 100).toFixed(1)}%</span>
                       </div>
                    </div>

                    <RiskLimitCard 
                      label="Leverage Cap" 
                      value={`${systemStatus?.circuitBreaker?.limits?.leverage || 5.0}x`} 
                      sub="Max Net Leverage" 
                      icon={<TrendingUp size={16} />} 
                    />
                    
                    <RiskLimitCard 
                      label="Pos Allocation" 
                      value={`$${(systemStatus?.circuitBreaker?.limits?.maxPositionSizeUsd || 10000).toLocaleString()}`} 
                      sub="Per Instrument" 
                      icon={<Layers size={16} />} 
                    />

                    <RiskLimitCard 
                      label="Daily Loss Limit" 
                      value={`$${(systemStatus?.circuitBreaker?.limits?.dailyLossLimitUsd || 500).toLocaleString()}`} 
                      sub="Trailing 24h window" 
                      icon={<ShieldAlert size={16} />} 
                      isWarning
                    />
                 </div>
              </div>

              {/* HyperLiquid Portfolio Monitor */}
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-4 bg-[#0A0C10] rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Live Equity</h3>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Wallet size={16} className="text-emerald-500" />
                    </div>
                  </div>
                  <div className="mb-8 relative z-10">
                    <div className="text-4xl font-black text-white italic tracking-tighter mb-1 select-all">
                      ${parseFloat(account?.accountValue || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">HL Balance</span>
                       <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-4 relative z-10">
                    <AccountMeta label="Withdrawable" value={`$${parseFloat(account?.withdrawable || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                    <AccountMeta 
                      label="Margin Usage" 
                      value={`${((parseFloat(account?.totalMarginUsed || "0") / parseFloat(account?.accountValue || "1")) * 100).toFixed(1)}%`} 
                      subValue={`$${parseFloat(account?.totalMarginUsed || "0").toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
                    />
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-8 bg-[#0A0C10] rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 text-cyan-500/5 group-hover:text-cyan-500/10 transition-colors">
                    <Activity size={120} />
                  </div>
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Capital Performance</h3>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] animate-pulse">Monitoring Risk Exposure</span>
                       <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 relative z-10">
                    <div>
                       <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Maintenance Margin Used</div>
                       <div className="text-2xl font-black text-white font-mono mb-2">
                          ${parseFloat(account?.totalMaintenanceMarginUsed || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}
                       </div>
                       <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-1000" 
                            style={{ width: `${Math.min(100, (parseFloat(account?.totalMaintenanceMarginUsed || "0") / Math.max(0.1, parseFloat(account?.accountValue || "1"))) * 1000)}%` }} 
                          />
                       </div>
                       <div className="text-[9px] font-bold text-slate-500 italic uppercase">Risk safeguard activates at 80% MM utilization</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl group/card hover:border-cyan-500/20 transition-all cursor-default">
                          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 group-hover/card:text-cyan-500 transition-colors">Free Margin</div>
                          <div className="text-sm font-black text-white font-mono">
                             ${(parseFloat(account?.accountValue || "0") - parseFloat(account?.totalMarginUsed || "0")).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                          </div>
                       </div>
                       <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl group/card hover:border-cyan-500/20 transition-all cursor-default">
                          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 group-hover/card:text-cyan-500 transition-colors">Safety Multiplier</div>
                          <div className="text-sm font-black text-white font-mono">{(parseFloat(account?.accountValue || "0") / Math.max(1, parseFloat(account?.totalMarginUsed || "0"))).toFixed(1)}x</div>
                       </div>
                       <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl col-span-2 flex items-center justify-between">
                          <div>
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">HL Exchange Sync</div>
                            <div className="text-[10px] font-black text-cyan-400 font-mono italic">Verified Active</div>
                          </div>
                          <RefreshCcw size={14} className="text-cyan-500/20 group-hover:rotate-180 transition-transform duration-500" />
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Visualization Grid */}
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-8">
                  <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                    
                    <div className="flex justify-between items-end mb-10">
                      <div>
                         <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Live Market Chart</h3>
                         <div className="flex items-baseline gap-4">
                            <h4 className="text-4xl font-black text-white italic tracking-tighter">{selectedAsset} <span className="text-cyan-500/50">/ PERP</span></h4>
                         </div>
                      </div>
                    </div>

                    <div className="h-[500px] w-full mb-12">
                       <TradingViewChart symbol={selectedAsset} />
                    </div>

                     <div className="flex justify-between items-end mb-10">
                      <div>
                         <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Performance Analytics</h3>
                         <div className="flex items-baseline gap-4">
                            <h4 className={`text-4xl font-black italic ${currentPnl >= 0 ? 'text-white' : 'text-rose-400'}`}>
                               {currentPnl >= 0 ? '+' : ''}${currentPnl.toFixed(2)}
                            </h4>
                            <span className={currentPnlPct >= 0 ? "text-emerald-400 font-bold text-sm" : "text-rose-400 font-bold text-sm"}>
                               {currentPnlPct >= 0 ? '+' : ''}{currentPnlPct.toFixed(2)}%
                            </span>
                         </div>
                      </div>
                      <div className="flex gap-1 p-1.5 bg-black/40 rounded-xl border border-white/5">
                        <ChartTab label="1D" active={true} />
                        <ChartTab label="1W" active={false} />
                        <ChartTab label="1M" active={false} />
                        <ChartTab label="ALL" active={false} />
                      </div>
                    </div>

                    <div className="h-[400px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={pnlHistory.length > 0 ? pnlHistory : [{ name: 'N/A', pnl: 0 }]}>
                           <defs>
                             <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                               <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                           <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#475569' }} />
                           <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#475569' }} tickFormatter={(v) => `$${v}`} />
                           <Tooltip 
                             content={<CustomTooltip />}
                             cursor={{ stroke: 'rgba(34,211,238,0.2)', strokeWidth: 1 }}
                           />
                           <Area type="monotone" dataKey="pnl" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorPnl)" />
                           <Area type="monotone" dataKey="vol" stroke="rgba(255,255,255,0.1)" strokeWidth={1} fill="transparent" strokeDasharray="5 5" />
                         </AreaChart>
                       </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Active Bots List */}
                  <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Live Deployments</h3>
                        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Auto-balancing enabled</div>
                    </div>
                    
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {bots.map((bot) => (
                      <BotCard 
                        key={bot.id} 
                        bot={bot} 
                        orders={orders}
                        positions={positions}
                        market={markets.find(m => m.symbol === bot.symbol)}
                        onStart={() => handleStartBot(bot.id)} 
                        onStop={() => handleStopBot(bot.id)} 
                        onSelect={() => setSelectedAsset(bot.symbol)}
                      />
                    ))}
                      {bots.length === 0 && (
                        <div className="col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-3xl group hover:border-cyan-500/20 transition-colors cursor-pointer" onClick={openCreateModal}>
                           <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                             <Plus className="text-slate-600 group-hover:text-cyan-400" />
                           </div>
                           <span className="text-xs font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-400">Deploy your first strategy</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-8">
                  {/* Position Panel */}
                  <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 relative min-h-[500px]">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex justify-between items-center">
                       Open Inventory
                       <span className="bg-cyan-500/10 text-cyan-500 px-2 py-0.5 rounded text-[9px]">{positions.length}</span>
                    </h3>
                    
                    <div className="space-y-4">
                        {positions.length > 0 ? positions.map((pos, i) => (
                          <PositionItem 
                            key={i} 
                            pos={pos.position} 
                            onSelect={() => setSelectedAsset(pos.position.coin)}
                          />
                        )) : (
                          <div className="flex flex-col items-center justify-center pt-20 text-center opacity-20">
                             <Layers size={48} className="mb-4" />
                             <p className="text-xs font-bold uppercase tracking-widest">No Active Exposure</p>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Market Pulse Feed */}
                  <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 flex flex-col h-[600px] relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-8 text-cyan-500 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp size={120} />
                     </div>

                     <div className="flex justify-between items-center mb-6 relative z-10">
                        <div>
                           <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Market Pulse</h3>
                           <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                              <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">{markets.length} Pairs Live</span>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <div className="flex p-1 bg-black/40 border border-white/5 rounded-lg">
                              {["volume", "change", "symbol"].map((s) => (
                                <button 
                                  key={s}
                                  onClick={() => setMarketSort(s as any)}
                                  className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${marketSort === s ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                  {s.slice(0, 3)}
                                </button>
                              ))}
                           </div>
                        </div>
                     </div>

                     <div className="relative mb-6 z-10">
                        <input 
                          type="text"
                          placeholder="Filter assets..."
                          value={marketSearch}
                          onChange={(e) => setMarketSearch(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold text-white placeholder:text-slate-700 outline-none focus:border-cyan-500/30 transition-all uppercase tracking-widest"
                        />
                        <Search size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" />
                     </div>

                     {/* Trending Mini Bar */}
                     <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar z-10">
                        {markets
                          .sort((a, b) => b.dayChange - a.dayChange)
                          .slice(0, 3)
                          .map(m => (
                            <div key={m.symbol} className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-2">
                               <span className="text-[9px] font-black italic text-emerald-400">{m.symbol}</span>
                               <span className="text-[8px] font-bold text-emerald-500">
                                 {(m.dayChange || 0) >= 0 ? '+' : ''}{(m.dayChange || 0).toFixed(1)}%
                               </span>
                            </div>
                          ))
                        }
                     </div>
                     
                     <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1 z-10">
                        <AnimatePresence mode="popLayout">
                          {markets
                            .filter(m => m.symbol.toLowerCase().includes(marketSearch.toLowerCase()))
                            .sort((a, b) => {
                              if (marketSort === "volume") {
                                const volA = parseFloat(a.volume || "0") || 0;
                                const volB = parseFloat(b.volume || "0") || 0;
                                return volB - volA;
                              }
                              if (marketSort === "change") return (b.dayChange || 0) - (a.dayChange || 0);
                              return (a.symbol || "").localeCompare(b.symbol || "");
                            })
                            .map((m) => (
                              <motion.div 
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={m.symbol}
                              >
                                <PulseItem 
                                  symbol={m.symbol} 
                                  price={parseFloat(m.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                                  change={`${(m.dayChange || 0) >= 0 ? '+' : ''}${(m.dayChange || 0).toFixed(2)}%`} 
                                  funding={m.funding}
                                  up={(m.dayChange || 0) >= 0} 
                                  onSelect={() => setSelectedAsset(m.symbol)}
                                />
                              </motion.div>
                            ))
                          }
                        </AnimatePresence>
                        {markets.length === 0 && (
                          <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
                             <RefreshCcw className="animate-spin text-cyan-500" />
                             <span className="text-[10px] uppercase tracking-widest font-bold">Synchronizing Global Feed...</span>
                          </div>
                        )}
                        {markets.length > 0 && markets.filter(m => m.symbol.toLowerCase().includes(marketSearch.toLowerCase())).length === 0 && (
                          <div className="py-10 text-center text-[10px] uppercase tracking-widest font-bold text-slate-700">
                             No matches found for "{marketSearch}"
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "strategies" && (
            <div className="space-y-12">
              <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                 <div className="flex justify-between items-center mb-8 relative z-10">
                    <div>
                       <h3 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-500 mb-2">Alpha Deployments</h3>
                       <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed">Instantly initialize proven DCA parameters for core assets.</p>
                    </div>
                    <div className="flex gap-4">
                       <button 
                         onClick={() => initializeQuickBot("BTC")}
                         className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all uppercase tracking-widest flex items-center gap-2 group/btn"
                       >
                         <TrendingUp size={14} className="text-cyan-500 group-hover/btn:text-black transition-colors" />
                         Quick BTC DCA
                       </button>
                       <button 
                         onClick={() => initializeQuickBot("ETH")}
                         className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all uppercase tracking-widest flex items-center gap-2 group/btn"
                       >
                         <TrendingUp size={14} className="text-cyan-500 group-hover/btn:text-black transition-colors" />
                         Quick ETH DCA
                       </button>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-8">
                {bots.map((bot) => (
                   <BotCard 
                    key={bot.id} 
                    bot={bot} 
                    orders={orders}
                    positions={positions}
                    onStart={() => handleStartBot(bot.id)} 
                    onStop={() => handleStopBot(bot.id)} 
                    onSelect={() => setSelectedAsset(bot.symbol)}
                  />
                ))}
                <div className="border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center p-12 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all cursor-pointer group" onClick={openCreateModal}>
                    <Plus size={32} className="text-slate-700 group-hover:text-cyan-400 group-hover:scale-110 transition-all mb-4" />
                    <span className="text-sm font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-300">Register Strategy</span>
                </div>
              </div>

              {presets.length > 0 && (
                <div className="pt-12 border-t border-white/5">
                   <div className="flex justify-between items-center mb-8">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-500 mb-2">Stored Templates</h3>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Rapid deployment configurations from your library</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-4 gap-6">
                      {presets.map(p => (
                        <div key={p.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-cyan-500/30 transition-all group">
                           <div className="flex justify-between items-start mb-4">
                              <span className="text-[8px] font-black uppercase tracking-widest text-cyan-500/50">{p.strategy}</span>
                              <button 
                                onClick={(e) => deletePreset(p.id, e)}
                                className="p-1.5 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={12} />
                              </button>
                           </div>
                           <h4 className="font-black text-sm text-white italic truncate mb-4">{p.presetName}</h4>
                           <button 
                             onClick={() => { applyPreset(p); setIsModalOpen(true); }}
                             className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all uppercase tracking-widest"
                           >
                             Use Template
                           </button>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-[#0A0C10] rounded-3xl border border-white/5 overflow-hidden">
               <div className="p-8 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Operation Ledger</h3>
                  <div className="flex gap-4">
                     <button className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Export CSV</button>
                     <button className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Clear Local</button>
                  </div>
               </div>
               <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/20 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      <th className="px-10 py-5">Timestamp</th>
                      <th className="px-10 py-5">Strategy / Asset</th>
                      <th className="px-10 py-5">Action</th>
                      <th className="px-10 py-5 text-right">Exc. Price</th>
                      <th className="px-10 py-5 text-right">Quantum</th>
                      <th className="px-10 py-5">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orders.map((order, i) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={i} 
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <td className="px-10 py-6 text-[11px] font-mono text-slate-500 uppercase tracking-tighter">
                          {new Date(order.created_at).toLocaleString()}
                        </td>
                        <td className="px-10 py-6">
                           <div className="flex flex-col">
                              <span className="text-xs font-black text-white italic group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{order.symbol} / PERP</span>
                              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Instance_{order.bot_id.slice(-4)}</span>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <span className={`px-2.5 py-1 rounded text-[10px] font-black italic tracking-tighter ${order.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {order.side} EXECUTION
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right font-mono text-white font-black text-sm">${order.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-10 py-6 text-right font-mono text-slate-400 font-bold text-xs">{order.size}</td>
                        <td className="px-10 py-6">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${['FILLED', 'RECONCILED_CLOSED'].includes(order.status) ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                 {order.status === 'FILLED' || order.status === 'RECONCILED_CLOSED' ? 'SETTLED' : 'PENDING'}
                              </span>
                            </div>
                        </td>
                      </motion.tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-10 py-32 text-center text-slate-700 italic font-medium uppercase tracking-[0.2em] text-xs">No ledger entries synchronized</td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
          )}
        </section>

        {/* Action Panel Fallbacks */}
        <AnimatePresence>
          {isModalOpen && (
            <ModalWrapper onClose={() => setIsModalOpen(false)}>
               <div className="p-6 lg:p-10 border-b border-white/5 relative overflow-hidden bg-gradient-to-r from-cyan-500/10 to-transparent">
                  <h3 className="text-2xl lg:text-3xl font-black text-white italic mb-1 uppercase tracking-tighter underline decoration-cyan-500/30 underline-offset-8 decoration-4">Deploy Strategy</h3>
                  <p className="text-slate-400 text-[10px] lg:text-xs font-bold tracking-widest uppercase">Initialize automated intelligence on Hyperliquid HyperEVM.</p>
               </div>

               <form onSubmit={handleCreateBot}>
                  <div className="p-6 lg:p-10 space-y-6 lg:space-y-8 overflow-y-auto custom-scrollbar">
                    {/* Presets Section */}
                    {presets.length > 0 && (
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Deployment Library</label>
                            <span className="text-[9px] text-slate-700 font-bold uppercase">{presets.length} Configs Stored</span>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {presets.map(p => (
                              <div key={p.id} className="group/preset relative">
                                <button 
                                  key={p.id}
                                  type="button"
                                  onClick={() => applyPreset(p)}
                                  className="pr-10 pl-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-slate-300 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all uppercase tracking-widest text-left min-w-[140px] flex flex-col gap-0.5"
                                >
                                  <span className="text-cyan-500/80 text-[8px] tracking-widest">{p.strategy}</span>
                                  <span className="truncate max-w-[120px]">{p.presetName || `${p.strategy} ${p.symbol}`}</span>
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => deletePreset(p.id, e)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all opacity-0 group-hover/preset:opacity-100"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
                       <FormGroup label="Asset Class">
                          <select 
                            value={botForm.symbol}
                            onChange={(e) => {
                              const symbol = e.target.value;
                              const market = markets.find(m => m.symbol === symbol);
                              const currentPrice = market ? parseFloat(market.price) : 60000;
                              
                              setBotForm({ 
                                ...botForm, 
                                symbol,
                                config: {
                                  ...botForm.config,
                                  // Suggest a 10% range around current price
                                  lowerPrice: Math.round(currentPrice * 0.95),
                                  upperPrice: Math.round(currentPrice * 1.05)
                                }
                              });
                            }}
                            className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none uppercase tracking-widest appearance-none custom-scrollbar"
                          >
                            {markets.map(m => (
                              <option key={m.symbol} value={m.symbol}>{m.symbol} / PERP - ${parseFloat(m.price).toLocaleString()}</option>
                            ))}
                            {markets.length === 0 && <option value="BTC">BTC / PERP</option>}
                          </select>
                       </FormGroup>
                       <FormGroup label="Mechanism">
                          <select 
                            value={botForm.strategy}
                            onChange={(e) => setBotForm({ ...botForm, strategy: e.target.value })}
                            className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none uppercase tracking-widest appearance-none"
                          >
                            <option value="DCA">Incremental DCA</option>
                            <option value="GRID">Volatility Grid</option>
                          </select>
                       </FormGroup>
                    </div>

                    <FormGroup label="Deployment Alias">
                        <input 
                          type="text"
                          placeholder="EX: ALPHA_BTC_ACCUMULATOR"
                          value={botForm.name}
                          onChange={(e) => setBotForm({ ...botForm, name: e.target.value })}
                          className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none placeholder:text-slate-800 uppercase"
                        />
                    </FormGroup>

                    <div className="pt-8 border-t border-white/5 bg-black/20 -mx-10 px-10 pb-10">
                       <div className="flex items-center gap-3 mb-8">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                             <Zap size={16} />
                          </div>
                          <div>
                             <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{botForm.strategy} Core Configuration</h4>
                             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic">Deterministic parameters for the execution engine</p>
                          </div>
                       </div>

                       {botForm.strategy === "DCA" ? (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
                            <FormGroup label="Execution Frequency">
                               <div className="relative">
                                  <input 
                                    type="number"
                                    value={botForm.config.intervalMinutes}
                                    onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, intervalMinutes: Number(e.target.value) } })}
                                    className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none pr-12"
                                  />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 uppercase">Min</span>
                               </div>
                            </FormGroup>
                            <FormGroup label="Quantum Allocation">
                               <div className="relative">
                                  <input 
                                    type="number"
                                    value={botForm.config.sizeUsd}
                                    onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, sizeUsd: Number(e.target.value) } })}
                                    className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none pr-12"
                                  />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 uppercase">USD</span>
                               </div>
                            </FormGroup>
                         </div>
                       ) : (
                         <div className="space-y-6 lg:space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
                              <FormGroup label="Price Boundary (Floor)">
                                 <div className="relative">
                                    <input 
                                      type="number"
                                      value={botForm.config.lowerPrice}
                                      onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, lowerPrice: Number(e.target.value) } })}
                                      className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 uppercase">$</span>
                                 </div>
                              </FormGroup>
                              <FormGroup label="Price Boundary (Ceiling)">
                                 <div className="relative">
                                    <input 
                                      type="number"
                                      value={botForm.config.upperPrice}
                                      onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, upperPrice: Number(e.target.value) } })}
                                      className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 uppercase">$</span>
                                 </div>
                              </FormGroup>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
                              <FormGroup label="Grid Density">
                                 <div className="relative">
                                    <input 
                                      type="number"
                                      value={botForm.config.numGrids}
                                      onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, numGrids: Number(e.target.value) } })}
                                      className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 uppercase">Levels</span>
                                 </div>
                              </FormGroup>
                              <FormGroup label="Quantum Allocation / Level">
                                 <div className="relative">
                                    <input 
                                      type="number"
                                      step="0.001"
                                      value={botForm.config.sizePerGrid}
                                      onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, sizePerGrid: Number(e.target.value) } })}
                                      className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 uppercase">{botForm.symbol}</span>
                                 </div>
                              </FormGroup>
                            </div>
                         </div>
                       )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8 pt-8 border-t border-white/5">
                          <FormGroup label="Take Profit (%)">
                             <input 
                               type="number"
                               placeholder="Optional"
                               value={botForm.config.tp}
                               onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, tp: e.target.value } })}
                               className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                             />
                          </FormGroup>
                          <FormGroup label="Stop Loss (%)">
                             <input 
                               type="number"
                               placeholder="Optional"
                               value={botForm.config.sl}
                               onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, sl: e.target.value } })}
                               className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-rose-400 focus:ring-2 focus:ring-rose-500/20 outline-none"
                             />
                          </FormGroup>
                       </div>
                    </div>

                  <div className="p-6 lg:p-10 bg-black/40 border-t border-white/5 space-y-4">
                    {showPresetNaming ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-3"
                      >
                         <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Assign Profile Name</label>
                         <div className="flex gap-2">
                            <input 
                              type="text"
                              value={presetNameInput}
                              onChange={(e) => setPresetNameInput(e.target.value)}
                              placeholder="e.g. Scalp Strategy V1"
                              className="flex-1 bg-[#050608] border border-cyan-500/30 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none"
                              autoFocus
                            />
                            <button 
                              onClick={saveAsPreset}
                              className="bg-cyan-500 text-black px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                            >
                              Finalize
                            </button>
                            <button 
                              onClick={() => { setShowPresetNaming(false); setPresetNameInput(""); }}
                              className="px-4 py-4 rounded-xl border border-white/10 text-slate-500 hover:text-white transition-all uppercase text-[10px] font-black"
                            >
                              Cancel
                            </button>
                         </div>
                      </motion.div>
                    ) : (
                      <div className="flex gap-4">
                        <button 
                          type="button"
                          onClick={() => saveAsPreset()}
                          className="flex-1 px-4 py-4 rounded-xl border border-white/10 text-[10px] font-black text-slate-400 hover:bg-white/5 transition-all uppercase tracking-widest"
                        >
                          Store Profile
                        </button>
                        <button 
                          type="submit"
                          className="flex-[2] bg-cyan-500 hover:bg-cyan-400 text-black px-10 py-4 rounded-xl font-black text-sm tracking-widest shadow-[0_4px_20px_rgba(34,211,238,0.2)]"
                        >
                          INITIALIZE DEPLOYMENT
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </ModalWrapper>
          )}

          {selectedOrder && (
            <ModalWrapper onClose={() => setSelectedOrder(null)}>
               <div className="p-6 lg:p-10 border-b border-white/5 bg-[#0A0C10]/50 relative">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                       <h3 className="text-xl lg:text-3xl font-black text-white italic tracking-tighter uppercase underline decoration-cyan-500/30 underline-offset-8">Exc Review</h3>
                       <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] mt-2">Validated settlement for operation block {selectedOrder.id.slice(0, 8)}</p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white">
                      <Plus size={24} className="rotate-45" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                     <span className={`px-3 py-1 rounded text-[10px] font-black italic tracking-widest uppercase ${selectedOrder.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {selectedOrder.side} Side
                      </span>
                      <span className="bg-white/5 border border-white/10 px-3 py-1 rounded text-[10px] font-black text-slate-300 uppercase tracking-widest">{selectedOrder.symbol} / PERPETUAL</span>
                  </div>
               </div>
                
               <div className="p-6 lg:p-10 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                  <div className="space-y-4 lg:space-y-8">
                     <DetailRow label="Hyperliquid OID" value={selectedOrder.hl_order_id || 'LOCAL_PENDING'} />
                     <DetailRow label="Strategic Parent" value={selectedOrder.bot_id} />
                     <DetailRow label="Network Status" value={selectedOrder.status} mono={false} />
                  </div>
                  <div className="space-y-4 lg:space-y-8 bg-black/20 p-6 lg:p-8 rounded-3xl border border-white/5">
                     <div className="grid grid-cols-1 gap-6">
                        <DetailRow label="Settlement Quote" value={`$${selectedOrder.price.toLocaleString(undefined, { minimumFractionDigits: 4 })}`} color="text-cyan-400" />
                        <DetailRow label="Quantum Size" value={selectedOrder.size} />
                        <DetailRow label="Timestamp" value={new Date(selectedOrder.created_at).toLocaleString()} />
                     </div>
                  </div>
               </div>

               <div className="p-8 bg-black/40 border-t border-white/5">
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-black text-[10px] tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase"
                  >
                    Close Ledger Review
                  </button>
               </div>
            </ModalWrapper>
          )}

          <OrderModal 
            isOpen={isOrderModalOpen} 
            onClose={() => setIsOrderModalOpen(false)} 
            markets={markets} 
            onSubmit={handleManualOrder} 
          />
        </AnimatePresence>
      </main>
    </div>
  );
}

// Sub-components

function SidebarLink({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 relative group ${active ? 'text-cyan-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
    >
      <div className={`transition-all duration-300 ${active ? 'scale-110' : 'group-hover:translate-x-1'}`}>
        {icon}
      </div>
      <span className="text-xs uppercase font-black tracking-widest">{label}</span>
      {active && (
        <>
          <motion.div layoutId="nav-glow" className="absolute inset-0 bg-cyan-500/[0.03] rounded-xl border border-cyan-500/20" />
          <motion.div layoutId="nav-indicator" className="absolute left-0 w-1 h-1/2 bg-cyan-500 rounded-full" />
        </>
      )}
    </button>
  );
}

function BentoStat({ label, value, delta, icon, color = "text-white" }: { label: string, value: string, delta: string, icon: any, color?: string }) {
  return (
    <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-6 hover:border-cyan-500/20 transition-all cursor-default group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 text-slate-800 opacity-20 group-hover:scale-110 group-hover:opacity-40 transition-all duration-500">
        {icon}
      </div>
      <div className="relative z-10">
        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
           {label}
        </div>
        <div className={`text-3xl font-black mb-1 italic tracking-tighter ${color}`}>{value}</div>
        <div className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">{delta}</div>
      </div>
    </div>
  );
}

function RiskLimitCard({ label, value, sub, icon, isWarning = false }: { label: string, value: string, sub: string, icon: any, isWarning?: boolean }) {
  return (
    <div className={`p-5 rounded-2xl border transition-all hover:scale-[1.02] ${isWarning ? 'bg-rose-500/[0.02] border-rose-500/10 hover:border-rose-500/30' : 'bg-white/[0.02] border-white/5 hover:border-cyan-500/20'}`}>
       <div className="flex justify-between items-start mb-4">
          <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-slate-500">
             {icon}
          </div>
          {isWarning && <span className="text-[8px] font-black text-rose-500 uppercase tracking-[0.2em] animate-pulse">Critical</span>}
       </div>
       <div className="space-y-0.5">
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">{label}</span>
          <div className={`text-xl font-black font-mono italic ${isWarning && value !== '0' ? 'text-rose-500' : 'text-white'}`}>{value}</div>
          <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest leading-none mt-1">{sub}</p>
       </div>
    </div>
  );
}

function BotCard({ bot, orders, positions, market, onStart, onStop, onSelect }: { bot: any, orders: any[], positions: any[], market?: any, onStart: () => Promise<void> | void, onStop: () => Promise<void> | void, onSelect: () => void, key?: any }) {
  const botOrders = orders.filter(o => o.bot_id === bot.id);
  const totalTrades = botOrders.filter(o => o.status === 'FILLED').length;
  
  const [tradeFlash, setTradeFlash] = useState(false);
  const prevTrades = useRef(totalTrades);

  useEffect(() => {
    if (totalTrades > prevTrades.current) {
      setTradeFlash(true);
      const timer = setTimeout(() => setTradeFlash(false), 2000);
      return () => clearTimeout(timer);
    }
    prevTrades.current = totalTrades;
  }, [totalTrades]);
  
  const lastOrder = botOrders[0]; 
  const timeSinceLast = lastOrder ? formatTimeAgo(new Date(lastOrder.created_at).getTime()) : 'No trades';
  
  const position = positions.find(p => p.position.coin === bot.symbol);
  const upnl = position ? parseFloat(position.position.unrealizedPnl) : 0;

  return (
    <motion.div 
      layout
      onClick={onSelect}
      className={`bg-black/30 rounded-2xl border overflow-hidden group transition-all duration-500 relative cursor-pointer ${
        tradeFlash ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_40px_rgba(34,211,238,0.15)] scale-[1.02]' : 'border-white/5 hover:border-cyan-500/30'
      }`}
    >
      {tradeFlash && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 pointer-events-none border-2 border-cyan-500/40 rounded-2xl z-10"
        />
      )}
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-500">
                   MOD_{bot.strategy}
                </span>
                {bot.status === 'RUNNING' && (
                  <span className="flex items-center gap-1.5 text-[9px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 uppercase tracking-widest">
                    <span className="w-1 h-1 bg-cyan-500 rounded-full animate-ping" />
                    Live
                  </span>
                )}
             </div>
             <h4 className="font-black text-lg text-white italic tracking-tight">{bot.name}</h4>
          </div>
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded text-[10px] font-black tracking-tighter border ${
            bot.status === 'RUNNING' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' :
            bot.status === 'ERROR' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' :
            bot.status === 'STOPPED' ? 'bg-amber-500/10 text-amber-500/70 border-amber-500/20' :
            'bg-white/5 text-slate-500 border-white/10 opacity-50'
          }`}>
            <span className={`w-1 h-1 rounded-full ${
              bot.status === 'RUNNING' ? 'bg-emerald-400 shadow-[0_0_5px_rgba(16,185,129,1)]' :
              bot.status === 'ERROR' ? 'bg-rose-400' :
              bot.status === 'STOPPED' ? 'bg-amber-500' :
              'bg-slate-500'
            }`} />
            {bot.status || 'OFFLINE'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="text-slate-600 font-bold text-[9px] uppercase tracking-widest mb-1 font-mono">Market</div>
            <div className="font-black text-white text-xs uppercase italic">{bot.symbol} / PERP</div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="text-slate-600 font-bold text-[9px] uppercase tracking-widest mb-1 font-mono">Live Price</div>
            <div className="font-black text-cyan-400 text-xs font-mono">${parseFloat(market?.price || "0").toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
           <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">Unrealized</span>
              <span className={`text-[10px] font-black font-mono ${upnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {upnl >= 0 ? '+' : ''}${upnl.toFixed(2)}
              </span>
           </div>
           <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">Trades</span>
              <span className="text-[10px] font-black text-slate-300 font-mono">{totalTrades}</span>
           </div>
           <div className="flex flex-col text-right">
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">Activity</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter truncate">{timeSinceLast}</span>
           </div>
        </div>

        {(bot.config?.tp || bot.config?.sl) && (
          <div className="grid grid-cols-2 gap-2 mb-6">
            {bot.config?.tp && (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex justify-between items-center">
                <span className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest">TP</span>
                <span className="text-[10px] font-black text-emerald-400 font-mono">+{bot.config.tp}%</span>
              </div>
            )}
            {bot.config?.sl && (
              <div className="px-3 py-1.5 rounded-lg bg-rose-500/5 border border-rose-500/10 flex justify-between items-center">
                <span className="text-[8px] font-black text-rose-500/50 uppercase tracking-widest">SL</span>
                <span className="text-[10px] font-black text-rose-400 font-mono">-{bot.config.sl}%</span>
              </div>
            )}
          </div>
        )}

        {bot.status === "RUNNING" ? (
          <button 
            onClick={onStop}
            className="w-full bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 hover:border-rose-500/30 shadow-inner"
          >
            <Square size={14} className="fill-current" /> Terminate Instance
          </button>
        ) : (
          <button 
            onClick={onStart}
            className="w-full bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/20 py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.05)]"
          >
            <Play size={14} className="fill-current" /> Initiate Strategy
          </button>
        )}
      </div>
    </motion.div>
  );
}

function formatTimeAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function PositionItem({ pos, onSelect }: { pos: any, onSelect: () => void, key?: any }) {
  const size = parseFloat(pos.szi);
  const side = size > 0 ? "LONG" : "SHORT";
  const upnl = parseFloat(pos.unrealizedPnl) || 0;
  
  return (
    <div 
      onClick={onSelect}
      className="group relative p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className={`w-2 h-10 rounded-full ${size > 0 ? 'bg-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'}`} />
        <div>
           <div className="font-black text-white text-sm italic uppercase tracking-tighter">{pos.coin}</div>
           <div className={`text-[10px] font-black tracking-widest ${size > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
             {side} {Math.abs(size)} @ {(parseFloat(pos.entryPx) || 0).toFixed(2)}
           </div>
        </div>
      </div>
      <div className="text-right">
         <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 font-mono">Unrealized PnL</div>
         <div className={`font-black font-mono text-sm ${upnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {upnl >= 0 ? '+' : ''}${upnl.toFixed(2)}
         </div>
      </div>
    </div>
  );
}

function PulseItem({ symbol, price, change, funding, up, onSelect }: { symbol: string, price: string, change: string, funding: string, up: boolean, onSelect: () => void, key?: any }) {
  const prevPriceRef = useRef(price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (!price || !prevPriceRef.current) return;
    try {
      const p = parseFloat(price.replace(/,/g, ''));
      const prevP = parseFloat(prevPriceRef.current.replace(/,/g, ''));
      
      if (!isNaN(p) && !isNaN(prevP)) {
        if (p > prevP) {
          setFlash("up");
        } else if (p < prevP) {
          setFlash("down");
        }
      }
    } catch (e) {
      console.warn("PulseItem flash calc failed", e);
    }

    const timer = setTimeout(() => setFlash(null), 1000);
    prevPriceRef.current = price;
    return () => clearTimeout(timer);
  }, [price]);

  const fundingVal = parseFloat(funding || "0") || 0;

  return (
    <div 
      onClick={onSelect}
      className={`flex justify-between items-center py-2.5 px-3 rounded-xl border border-transparent hover:bg-white/[0.03] transition-all duration-300 group cursor-pointer ${
      flash === "up" ? "bg-emerald-500/5" : flash === "down" ? "bg-rose-500/5" : ""
    }`}>
       <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[10px] text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-400/20 transition-all font-mono">
             {symbol.slice(0, 2)}
          </div>
          <div>
             <div className="text-[11px] font-black text-white tracking-widest uppercase flex items-center gap-1.5">
               {symbol}
               <span className="text-[8px] bg-white/5 px-1 rounded text-slate-600">P</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="text-[9px] font-bold font-mono text-slate-600 uppercase tracking-tighter">Perp</div>
               <div className={`text-[8px] font-black font-mono ${fundingVal >= 0 ? 'text-emerald-500/50' : 'text-rose-500/50'}`}>
                 {(fundingVal * 100).toFixed(4)}% f
               </div>
             </div>
          </div>
       </div>
       <div className="text-right">
          <div className={`text-xs font-black font-mono tracking-tighter transition-colors duration-300 ${
            flash === "up" ? "text-emerald-400" : flash === "down" ? "text-rose-400" : "text-white"
          }`}>
            ${price}
          </div>
          <div className={`text-[10px] font-black ${up ? 'text-emerald-400' : 'text-rose-400'} italic flex items-center justify-end gap-1`}>
            {up ? <TrendingUp size={10} /> : <AlertTriangle size={10} className="rotate-180" />}
            {change}
          </div>
       </div>
    </div>
  );
}

function ModalWrapper({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:p-6 bg-black/90 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0A0C10] border border-white/10 w-full max-w-2xl rounded-[24px] lg:rounded-[32px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden relative max-h-[90vh] overflow-y-auto"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        {children}
      </motion.div>
      <div className="absolute inset-0 z-[-1]" onClick={onClose} />
    </div>
  );
}

function FormGroup({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] label-glow">{label}</label>
      <div className="relative group">
        {children}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-cyan-500 group-focus-within:w-full transition-all duration-500" />
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono = true, color = "text-slate-200" }: { label: string, value: any, mono?: boolean, color?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[9px] uppercase tracking-[0.25em] text-slate-600 font-black">{label}</div>
      <div className={`${mono ? 'font-mono' : ''} ${color} text-sm break-all font-black italic tracking-tight`}>{value}</div>
    </div>
  );
}

function HeaderQuickStat({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col">
       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
       <span className="text-xs font-black text-white italic tracking-tighter">{value}</span>
    </div>
  );
}

function TradingViewChart({ symbol }: { symbol: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    
    try {
      // Clean up
      container.current.innerHTML = '';
      
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": `COINBASE:${symbol}USD`, // Using Coinbase as reliable fallback for generic UI
        "interval": "1",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": "tradingview_chart",
        "support_host": "https://www.tradingview.com"
      });
      container.current.appendChild(script);
    } catch (e) {
      console.error("TradingView widget injection failed", e);
    }
  }, [symbol]);

  return (
    <div className="w-full h-full bg-[#0A0C10] rounded-3xl overflow-hidden border border-white/5 shadow-2xl" ref={container} />
  );
}

function ChartTab({ label, active }: { label: string, active: boolean }) {
  return (
    <button className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all tracking-widest italic ${active ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-slate-300'}`}>
       {label}
    </button>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#050608] border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic underline decoration-slate-800 underline-offset-4">{label} Analysis</p>
        <p className="text-sm font-black text-emerald-400 italic">PnL: +${(payload?.[0]?.value || 0).toFixed(2)}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Quantum Vol: ${(payload?.[1]?.value || 0).toLocaleString()}</p>
      </div>
    );
  }
  return null;
}

function SimulatedPnL({ isActive }: { isActive: boolean }) {
  const [val, setVal] = useState(() => (Math.random() * 20 - 5));

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setVal(v => v + (Math.random() - 0.48) * 0.1);
    }, 2000);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <motion.div 
      initial={false}
      animate={{ color: val >= 0 ? '#34d399' : '#f87171' }}
      className="font-black font-mono text-xs italic tracking-tighter transition-colors"
    >
      { (val || 0) >= 0 ? '+' : ''}${(val || 0).toFixed(2)}
    </motion.div>
  );
}

function AccountMeta({ label, value, subValue }: { label: string, value: string, subValue?: string }) {
  return (
    <div className="flex justify-between items-center group/meta">
       <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover/meta:text-slate-400 transition-colors">{label}</span>
       <div className="text-right">
          <div className="text-sm font-black text-white font-mono tracking-tighter">{value}</div>
          {subValue && <div className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter">{subValue}</div>}
       </div>
    </div>
  );
}

function OrderModal({ isOpen, onClose, markets, onSubmit }: { isOpen: boolean, onClose: () => void, markets: any[], onSubmit: (data: any) => Promise<void> }) {
  const [form, setForm] = useState({
    symbol: "BTC",
    isBuy: true,
    price: "",
    size: "",
    reduceOnly: false,
    tp: "",
    sl: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && markets.length > 0 && !form.symbol) {
      setForm(f => ({ ...f, symbol: markets[0].symbol }));
    }
  }, [isOpen, markets]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-[#0A0C10] border border-white/10 rounded-3xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] relative z-10"
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-xl font-black italic text-white tracking-tight uppercase">Manual Order Execution</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <Plus size={24} className="rotate-45" />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <button 
               type="button"
               onClick={() => setForm(f => ({ ...f, isBuy: true }))}
               className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${form.isBuy ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
             >
               Buy / Long
             </button>
             <button 
               type="button"
               onClick={() => setForm(f => ({ ...f, isBuy: false }))}
               className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${!form.isBuy ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
             >
               Sell / Short
             </button>
          </div>

          <div className="space-y-4">
             <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Target Asset</label>
                <select 
                  value={form.symbol}
                  onChange={(e) => {
                    const price = markets.find(m => m.symbol === e.target.value)?.price || "";
                    setForm(f => ({ ...f, symbol: e.target.value, price }));
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-cyan-500/30 transition-all font-mono"
                >
                  <option value="" disabled>Select Asset</option>
                  {markets.map(m => (
                    <option key={m.symbol} value={m.symbol}>{m.symbol} - ${parseFloat(m.price).toLocaleString()}</option>
                  ))}
                </select>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Order Price (Limit)</label>
                   <input 
                     type="number"
                     step="any"
                     required
                     placeholder="0.00"
                     value={form.price}
                     onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-cyan-500/30 transition-all font-mono"
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Size (Units)</label>
                   <input 
                     type="number"
                     step="any"
                     required
                     placeholder="1.0"
                     value={form.size}
                     onChange={(e) => setForm(f => ({ ...f, size: e.target.value }))}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-cyan-500/30 transition-all font-mono"
                   />
                </div>
             </div>

             <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={form.reduceOnly}
                  onChange={(e) => setForm(f => ({ ...f, reduceOnly: e.target.checked }))}
                  className="hidden"
                />
                <div className={`w-10 h-6 rounded-full transition-all relative ${form.reduceOnly ? 'bg-cyan-500' : 'bg-slate-800'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.reduceOnly ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300">Reduce Only</span>
             </label>

             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Take Profit (%)</label>
                   <input 
                     type="number"
                     placeholder="Optional"
                     value={form.tp}
                     onChange={(e) => setForm(f => ({ ...f, tp: e.target.value }))}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-emerald-400 font-bold outline-none focus:border-emerald-500/30 transition-all font-mono"
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Stop Loss (%)</label>
                   <input 
                     type="number"
                     placeholder="Optional"
                     value={form.sl}
                     onChange={(e) => setForm(f => ({ ...f, sl: e.target.value }))}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-rose-400 font-bold outline-none focus:border-rose-500/30 transition-all font-mono"
                   />
                </div>
             </div>
          </div>

          <button 
            disabled={submitting}
            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
              form.isBuy ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : 'bg-rose-500 hover:bg-rose-400 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {submitting ? <RefreshCcw className="animate-spin" size={16} /> : (form.isBuy ? 'Execute Long Order' : 'Execute Short Order')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
