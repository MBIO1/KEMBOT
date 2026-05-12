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
  Trash2
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

// Mock PnL data for the chart
const pnlData = [
  { name: "00:00", pnl: 0, vol: 1200 },
  { name: "04:00", pnl: 12, vol: 2400 },
  { name: "08:00", pnl: -5, vol: 1800 },
  { name: "12:00", pnl: 25, vol: 4500 },
  { name: "16:00", pnl: 48, vol: 3200 },
  { name: "20:00", pnl: 32, vol: 2900 },
  { name: "23:59", pnl: 54, vol: 3800 },
];

export default function App() {
  const [bots, setBots] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketSearch, setMarketSearch] = useState("");
  const [marketSort, setMarketSort] = useState<"volume" | "change" | "symbol">("volume");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      const controllers = [new AbortController(), new AbortController(), new AbortController(), new AbortController()];
      const timeout = setTimeout(() => controllers.forEach(c => c.abort()), 8000);

      const [botsRes, ordersRes, posRes, marketRes] = await Promise.all([
        fetch("/api/bots", { signal: controllers[0].signal }).then(r => r.ok ? r.json() : Promise.reject("Failed to fetch bots")).catch(err => ({ error: err.message || err })),
        fetch("/api/orders", { signal: controllers[1].signal }).then(r => r.ok ? r.json() : Promise.reject("Failed to fetch orders")).catch(err => ({ error: err.message || err })),
        fetch("/api/positions", { signal: controllers[2].signal }).then(r => r.ok ? r.json() : Promise.reject("Failed to fetch positions")).catch(err => ({ error: err.message || err })),
        fetch("/api/markets", { signal: controllers[3].signal }).then(r => r.ok ? r.json() : Promise.reject("Failed to fetch markets")).catch(err => ({ error: err.message || err }))
      ]);

      clearTimeout(timeout);
      
      if (botsRes.error || ordersRes.error || posRes.error || marketRes.error) {
        addToast("Network synchronization error. Retrying...", "error");
      }

      setBots(Array.isArray(botsRes) ? botsRes : []);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setPositions(Array.isArray(posRes) ? posRes : []);
      
      if (Array.isArray(marketRes)) {
        setMarkets(prev => {
          // Create a lookup for current prices to preserve WS updates
          const priceMap = new Map(prev.map(m => [m.symbol, m.price]));
          return marketRes.map(m => ({
            ...m,
            // Prefer the current price in state if it exists (likely from WS)
            // but for the first load, use the polled price.
            price: priceMap.get(m.symbol) || m.price
          }));
        });
      }
    } catch (e: any) {
      console.error("Fetch error", e);
      addToast("Failed to connect to server.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedPresets = localStorage.getItem("hyperquant_presets");
    if (savedPresets) setPresets(JSON.parse(savedPresets));
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const setupWS = async () => {
      try {
        const configRes = await fetch("/api/config");
        if (!configRes.ok) return;
        const config = await configRes.json();

        ws = new WebSocket(config.wsUrl);

        ws.onopen = () => {
          console.log("Hyperliquid WS Connected");
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

        ws.onerror = (err) => {
          console.error("WebSocket Error:", err);
        };

        ws.onclose = () => {
          console.log("WebSocket Closed, attempting reconnect...");
          reconnectTimeout = setTimeout(setupWS, 5000);
        };
      } catch (err) {
        console.error("Failed to setup WebSocket:", err);
        reconnectTimeout = setTimeout(setupWS, 5000);
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

  const saveAsPreset = () => {
    if (!validateForm()) return;
    const defaultName = botForm.name || `${botForm.strategy} ${botForm.symbol} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const name = prompt("Enter a name for this preset:", defaultName);
    
    if (name === null) return; // Cancelled

    const newPresets = [...presets, { ...botForm, presetName: name, id: Date.now() }];
    setPresets(newPresets);
    localStorage.setItem("hyperquant_presets", JSON.stringify(newPresets));
    addToast(`Config '${name}' saved to library.`, "success");
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

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-hidden flex">
      {/* Glass Sidebar */}
      <aside className="w-64 bg-[#0A0C10] border-r border-white/5 flex flex-col z-40 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
        
        <div className="p-8 relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-cyan-500 flex items-center justify-center rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <Activity size={20} className="text-black" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tighter text-white leading-tight">HYPERQUANT</h1>
              <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/50 font-bold">Terminal v1.2</div>
            </div>
          </div>

          <nav className="space-y-1">
            <SidebarLink icon={<LayoutDashboard size={18} />} label="Mission Control" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
            <SidebarLink icon={<Layers size={18} />} label="Bot Registry" active={activeTab === "strategies"} onClick={() => setActiveTab("strategies")} />
            <SidebarLink icon={<History size={18} />} label="Trade Ledger" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
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
                  Testnet Vault
                </span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Live</span>
              </div>
              <div className="text-xl font-bold text-white font-mono">$10,482.50</div>
              <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                <div className="bg-cyan-500 h-full w-2/3" />
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
        <header className="sticky top-0 z-30 bg-[#050608]/80 backdrop-blur-md border-b border-white/5 px-10 py-6 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">{activeTab === "dashboard" ? "Dashboard" : activeTab.replace(/([A-Z])/g, ' $1')}</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                Connectivity: Optimal (12ms)
              </div>
            </div>
            
            <div className="h-8 w-[1px] bg-white/10" />
            
            <div className="flex gap-4">
              <HeaderQuickStat label="Active Streams" value="4" />
              <HeaderQuickStat label="Network Status" value="Healthy" />
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative group">
               <input 
                 type="text" 
                 placeholder="Search assets..." 
                 className="bg-white/5 border border-white/10 rounded-full px-5 py-2 text-xs w-64 focus:w-80 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-slate-600 font-medium"
               />
               <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
             </div>
             
             <button className="p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors relative">
               <Bell size={18} />
               <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-500 rounded-full border-2 border-[#050608]" />
             </button>

             <button 
                onClick={openCreateModal}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-2.5 rounded-xl font-black text-xs tracking-widest flex items-center gap-2 transition-all shadow-[0_4px_20px_rgba(34,211,238,0.2)] hover:scale-105 active:scale-95"
              >
                <Plus size={18} />
                INIT STRATEGY
              </button>
          </div>
        </header>

        <section className="p-10 pb-32 relative z-10">
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-md">
            <AnimatePresence mode="popLayout">
              {toasts.map((t) => (
                <motion.div 
                  key={t.id}
                  initial={{ opacity: 0, y: -40, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  layout
                  className={`pointer-events-auto w-full px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border flex items-center gap-4 backdrop-blur-xl ${
                    t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100' : 'bg-rose-500/10 border-rose-500/20 text-rose-100'
                  }`}
                >
                  {t.type === 'success' ? <Activity size={20} className="text-emerald-400" /> : <AlertTriangle size={20} className="text-rose-400" />}
                  <div className="flex-1 flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{t.type === 'success' ? 'Protocol Success' : 'System Alert'}</span>
                     <span className="text-xs font-bold opacity-80 leading-tight">{t.message}</span>
                  </div>
                  <button onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))} className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0">
                    <Plus size={16} className="rotate-45" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Bento Stats */}
              <div className="grid grid-cols-4 gap-6">
                 <BentoStat label="Realized PnL" value="+$54.20" delta="+12.4% vs 24h" icon={<TrendingUp className="text-emerald-400" />} color="text-emerald-400" />
                 <BentoStat label="Deployment Load" value={(bots || []).filter(b => b?.status === "RUNNING").length.toString()} delta={`Allocated of ${(bots || []).length}`} icon={<Cpu className="text-cyan-400" />} />
                 <BentoStat label="Asset Exposure" value={(positions || []).length.toString()} delta="Active Markets" icon={<Layers className="text-violet-400" />} />
                 <BentoStat label="Terminal Vol" value="$12,450" delta="+2.5k today" icon={<Activity className="text-slate-400" />} />
              </div>

              {/* Main Visualization Grid */}
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-8">
                  <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                    
                    <div className="flex justify-between items-end mb-10">
                      <div>
                         <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Performance Analytics</h3>
                         <div className="flex items-baseline gap-4">
                            <h4 className="text-4xl font-black text-white italic">+$542.80</h4>
                            <span className="text-emerald-400 font-bold text-sm">+2.45%</span>
                         </div>
                      </div>
                      <div className="flex gap-1 p-1.5 bg-black/40 rounded-xl border border-white/5">
                        <ChartTab label="1D" active={false} />
                        <ChartTab label="1W" active={true} />
                        <ChartTab label="1M" active={false} />
                        <ChartTab label="ALL" active={false} />
                      </div>
                    </div>

                    <div className="h-[400px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={pnlData}>
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
                          onStart={() => handleStartBot(bot.id)} 
                          onStop={() => handleStopBot(bot.id)} 
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
                          <PositionItem key={i} pos={pos.position} />
                        )) : (
                          <div className="flex flex-col items-center justify-center pt-20 text-center opacity-20">
                             <Layers size={48} className="mb-4" />
                             <p className="text-xs font-bold uppercase tracking-widest">No Active Exposure</p>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Market Pulse Feed */}
                  <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 flex flex-col h-[600px]">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Market Pulse</h3>
                        <div className="flex gap-2">
                           <select 
                             value={marketSort}
                             onChange={(e) => setMarketSort(e.target.value as any)}
                             className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase text-slate-400 outline-none hover:border-cyan-500/30 transition-colors"
                           >
                              <option value="volume">Vol</option>
                              <option value="change">% Chg</option>
                              <option value="symbol">Name</option>
                           </select>
                        </div>
                     </div>

                     <div className="relative mb-6">
                        <input 
                          type="text"
                          placeholder="Filter pairs..."
                          value={marketSearch}
                          onChange={(e) => setMarketSearch(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold text-white placeholder:text-slate-700 outline-none focus:border-cyan-500/30 transition-all uppercase tracking-widest"
                        />
                        <Search size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" />
                     </div>
                     
                     <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {markets
                          .filter(m => m.symbol.toLowerCase().includes(marketSearch.toLowerCase()))
                          .sort((a, b) => {
                            if (marketSort === "volume") return parseFloat(b.volume) - parseFloat(a.volume);
                            if (marketSort === "change") return b.dayChange - a.dayChange;
                            return a.symbol.localeCompare(b.symbol);
                          })
                          .map((m) => (
                            <PulseItem 
                              key={m.symbol}
                              symbol={m.symbol} 
                              price={parseFloat(m.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                              change={`${(m.dayChange || 0) >= 0 ? '+' : ''}${(m.dayChange || 0).toFixed(2)}%`} 
                              up={(m.dayChange || 0) >= 0} 
                            />
                          ))
                        }
                        {markets.length === 0 && (
                          <div className="py-20 text-center opacity-30 italic text-[10px] uppercase tracking-widest font-bold">
                             Synchronizing feed...
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
              <div className="grid grid-cols-3 gap-8">
                {bots.map((bot) => (
                   <BotCard 
                    key={bot.id} 
                    bot={bot} 
                    orders={orders}
                    positions={positions}
                    onStart={() => handleStartBot(bot.id)} 
                    onStop={() => handleStopBot(bot.id)} 
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
                             <div className={`w-1.5 h-1.5 rounded-full ${order.status === 'FILLED' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {order.status === 'FILLED' ? 'SETTLED' : 'PENDING'}
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
               <div className="p-10 border-b border-white/5 relative overflow-hidden bg-gradient-to-r from-cyan-500/10 to-transparent">
                  <h3 className="text-3xl font-black text-white italic mb-1 uppercase tracking-tighter underline decoration-cyan-500/30 underline-offset-8 decoration-4">Deploy Strategy</h3>
                  <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Initialize automated intelligence on Hyperliquid HyperEVM.</p>
               </div>

               <form onSubmit={handleCreateBot}>
                  <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
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

                    <div className="grid grid-cols-2 gap-8">
                       <FormGroup label="Asset Class">
                          <select 
                            value={botForm.symbol}
                            onChange={(e) => setBotForm({ ...botForm, symbol: e.target.value })}
                            className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none uppercase tracking-widest appearance-none"
                          >
                            <option value="BTC">BTC / PERP</option>
                            <option value="ETH">ETH / PERP</option>
                            <option value="SOL">SOL / PERP</option>
                            <option value="SUI">SUI / PERP</option>
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

                    <div className="pt-8 border-t border-white/5">
                       {botForm.strategy === "DCA" ? (
                         <div className="grid grid-cols-2 gap-8">
                            <FormGroup label="Frequency (Minutes)">
                               <input 
                                 type="number"
                                 value={botForm.config.intervalMinutes}
                                 onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, intervalMinutes: Number(e.target.value) } })}
                                 className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none"
                               />
                            </FormGroup>
                            <FormGroup label="Quantum (USD / EXEC)">
                               <input 
                                 type="number"
                                 value={botForm.config.sizeUsd}
                                 onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, sizeUsd: Number(e.target.value) } })}
                                 className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none"
                               />
                            </FormGroup>
                         </div>
                       ) : (
                         <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                              <FormGroup label="Price Floor">
                                 <input 
                                   type="number"
                                   value={botForm.config.lowerPrice}
                                   onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, lowerPrice: Number(e.target.value) } })}
                                   className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none"
                                 />
                              </FormGroup>
                              <FormGroup label="Price Ceiling">
                                 <input 
                                   type="number"
                                   value={botForm.config.upperPrice}
                                   onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, upperPrice: Number(e.target.value) } })}
                                   className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none"
                                 />
                              </FormGroup>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                              <FormGroup label="Resolution (Grid Count)">
                                 <input 
                                   type="number"
                                   value={botForm.config.numGrids}
                                   onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, numGrids: Number(e.target.value) } })}
                                   className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none"
                                 />
                              </FormGroup>
                              <FormGroup label="Quantum / Grid (Asset)">
                                 <input 
                                   type="number"
                                   step="0.001"
                                   value={botForm.config.sizePerGrid}
                                   onChange={(e) => setBotForm({ ...botForm, config: { ...botForm.config, sizePerGrid: Number(e.target.value) } })}
                                   className="w-full bg-[#050608] border border-white/10 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-cyan-500/20 outline-none"
                                 />
                              </FormGroup>
                            </div>
                         </div>
                       )}
                    </div>
                   </div>

                        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
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

                  <div className="p-10 bg-black/40 border-t border-white/5 flex gap-4">
                    <button 
                      type="button"
                      onClick={saveAsPreset}
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
               </form>
            </ModalWrapper>
          )}

          {selectedOrder && (
            <ModalWrapper onClose={() => setSelectedOrder(null)}>
               <div className="p-10 border-b border-white/5 bg-[#0A0C10]/50 relative">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                       <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase underline decoration-cyan-500/30 underline-offset-8">Exc Review</h3>
                       <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] mt-2">Validated settlement for operation block {selectedOrder.id.slice(0, 8)}</p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white">
                      <Plus size={24} className="rotate-45" />
                    </button>
                  </div>
                  
                  <div className="flex gap-3">
                     <span className={`px-3 py-1 rounded text-[10px] font-black italic tracking-widest uppercase ${selectedOrder.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {selectedOrder.side} Side
                      </span>
                      <span className="bg-white/5 border border-white/10 px-3 py-1 rounded text-[10px] font-black text-slate-300 uppercase tracking-widest">{selectedOrder.symbol} / PERPETUAL</span>
                  </div>
               </div>
                
               <div className="p-10 grid grid-cols-2 gap-10">
                  <div className="space-y-8">
                     <DetailRow label="Hyperliquid OID" value={selectedOrder.hl_order_id || 'LOCAL_PENDING'} />
                     <DetailRow label="Strategic Parent" value={selectedOrder.bot_id} />
                     <DetailRow label="Network Status" value={selectedOrder.status} mono={false} />
                  </div>
                  <div className="space-y-8 bg-black/20 p-8 rounded-3xl border border-white/5">
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

function BotCard({ bot, orders, positions, onStart, onStop }: { bot: any, orders: any[], positions: any[], onStart: () => Promise<void> | void, onStop: () => Promise<void> | void, key?: any }) {
  const botOrders = orders.filter(o => o.bot_id === bot.id);
  const totalTrades = botOrders.filter(o => o.status === 'FILLED').length;
  
  const lastOrder = botOrders[0]; // orders are sorted DESC by created_at in server
  const timeSinceLast = lastOrder ? formatTimeAgo(new Date(lastOrder.created_at).getTime()) : 'No trades';
  
  const position = positions.find(p => p.position.coin === bot.symbol);
  const upnl = position ? parseFloat(position.position.unrealizedPnl) : 0;

  return (
    <motion.div 
      layout
      key={bot.id}
      className="bg-black/30 rounded-2xl border border-white/5 overflow-hidden group hover:border-cyan-500/30 transition-all duration-500"
    >
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
          <div className={`px-2.5 py-1 rounded text-[10px] font-black tracking-tighter border ${
            bot.status === 'RUNNING' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            bot.status === 'ERROR' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
            'bg-white/5 text-slate-500 border-white/10 opacity-50'
          }`}>
            {bot.status}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="text-slate-600 font-bold text-[9px] uppercase tracking-widest mb-1 font-mono">Market</div>
            <div className="font-black text-white text-xs uppercase italic">{bot.symbol} / PERP</div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="text-slate-600 font-bold text-[9px] uppercase tracking-widest mb-1 font-mono">Session PnL</div>
            <SimulatedPnL isActive={bot.status === 'RUNNING'} />
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

function PositionItem({ pos }: { pos: any, key?: any }) {
  const size = parseFloat(pos.szi);
  const side = size > 0 ? "LONG" : "SHORT";
  const upnl = parseFloat(pos.unrealizedPnl) || 0;
  
  return (
    <div className="group relative p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all duration-300">
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

function PulseItem({ symbol, price, change, up }: { symbol: string, price: string, change: string, up: boolean, key?: any }) {
  return (
    <div className="flex justify-between items-center py-2 group cursor-default">
       <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-black text-[10px] text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-400/20 transition-all font-mono">
             {symbol[0]}
          </div>
          <div>
             <div className="text-xs font-black text-white tracking-widest uppercase">{symbol}</div>
             <div className="text-[10px] font-bold font-mono text-slate-600 uppercase">Perpetual</div>
          </div>
       </div>
       <div className="text-right">
          <div className="text-xs font-black font-mono text-white tracking-tighter animate-pulse-slow">${price}</div>
          <div className={`text-[10px] font-black ${up ? 'text-emerald-400' : 'text-rose-400'} italic`}>{change}</div>
       </div>
    </div>
  );
}

function ModalWrapper({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0A0C10] border border-white/10 w-full max-w-2xl rounded-[32px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden relative"
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
  const [val, setVal] = useState(12.40);

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
