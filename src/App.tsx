import React, { useState, useEffect, useRef } from "react";
import { OrderBook } from './components/OrderBook';
import { AlertCircle, PlayCircle, StopCircle, CheckCircle2, Loader2, 
  Activity, 
  TrendingUp, 
  Zap, 
  Shield, 
  Layers, 
  Settings, 
  History, 
  Bell, 
  ChevronRight, 
  Search, 
  Plus, 
  AlertTriangle,
  X,
  CreditCard,
  ExternalLink,
  Target,
  BarChart3,
  Globe,
  Cpu,
  Menu,
  Download,
  Play,
  Calendar,
  LineChart,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

type TabType = "dashboard" | "strategies" | "history" | "alerts" | "settings" | "activity" | "backtest" | "bots";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [activeBots, setActiveBots] = useState<any>({ dca: {}, grid: {} });
  const [pendingBotAction, setPendingBotAction] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, string>>({});
  const [pnlHistory, setPnlHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({
    equity: 0, 
    unrealizedTotal: 0,
    filled: 0, 
    totalOrders: 0,
    runningBots: 0, 
    totalBots: 0,
  });
  const [accountSummary, setAccountSummary] = useState({
    balance: 0,
    drawdown: 0,
    leverage: 0,
    liqPrice: 0,
    activePositions: 0
  });
  const lastAlertedPnLRef = useRef<number | null>(null);
  const [telegramConfig, setTelegramConfig] = useState(() => {
    const saved = localStorage.getItem('aq_telegramConfig');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      botToken: "",
      chatId: "",
      pnlThreshold: "5.0"
    };
  });

  // Global & Preset States
  const [globalOrderSize, setGlobalOrderSize] = useState(() => {
    return localStorage.getItem('aq_globalOrderSize') || "100";
  });
  const [strategyPresets, setStrategyPresets] = useState<{name: string, dcaConfig: any, gridConfig: any}[]>(() => {
    const saved = localStorage.getItem('aq_strategyPresets');
    return saved ? JSON.parse(saved) : [];
  });
  const [presetName, setPresetName] = useState("");

  // Strategy Configs - Enhanced with Margin
  const [dcaConfig, setDcaConfig] = useState(() => {
    const saved = localStorage.getItem('aq_dcaConfig');
    return saved ? JSON.parse(saved) : {
      interval: "1h",
      amount: "", // Empty to test global fallback
      multiplier: "1.5",
      takeProfit: "5.0",
      marginMode: "isolated",
      initialMargin: "500"
    };
  });
  const [gridConfig, setGridConfig] = useState(() => {
    const saved = localStorage.getItem('aq_gridConfig');
    return saved ? JSON.parse(saved) : {
      levels: "10",
      spread: "1.0",
      size: "50",
      takeProfit: "3.0",
      marginMode: "cross",
      initialMargin: "1000"
    };
  });

  // Alert Thresholds
  const [alertThresholds, setAlertThresholds] = useState(() => {
    const saved = localStorage.getItem('aq_alertThresholds');
    return saved ? JSON.parse(saved) : {
      maxDrawdown: "5.0",
      liqProximity: "10.0",
      priceTarget: "",
      pnlChange: ""
    };
  });

  // Auto-save effects
  useEffect(() => { localStorage.setItem('aq_telegramConfig', JSON.stringify(telegramConfig)); }, [telegramConfig]);
  useEffect(() => { localStorage.setItem('aq_globalOrderSize', globalOrderSize); }, [globalOrderSize]);
  useEffect(() => { localStorage.setItem('aq_strategyPresets', JSON.stringify(strategyPresets)); }, [strategyPresets]);
  useEffect(() => { localStorage.setItem('aq_dcaConfig', JSON.stringify(dcaConfig)); }, [dcaConfig]);
  useEffect(() => { localStorage.setItem('aq_gridConfig', JSON.stringify(gridConfig)); }, [gridConfig]);
  useEffect(() => { localStorage.setItem('aq_alertThresholds', JSON.stringify(alertThresholds)); }, [alertThresholds]);

  // Backtest State
  const [backtestParams, setBacktestParams] = useState({
    strategy: "grid",
    startDate: "2024-01-01",
    endDate: "2024-05-16",
    capital: "10000"
  });
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResults, setBacktestResults] = useState<any>(null);

  const savePreset = () => {
    if (!presetName) {
      addToast("Please enter a preset name", "error");
      return;
    }
    setStrategyPresets(prev => [...prev, { name: presetName, dcaConfig: {...dcaConfig}, gridConfig: {...gridConfig} }]);
    setPresetName("");
    addToast(`Preset '${presetName}' cached successfully`, "success");
  };
  
  const deletePreset = (idx: number) => {
    setStrategyPresets(prev => prev.filter((_, i) => i !== idx));
    addToast("Preset deleted", "info");
  };

  const loadPreset = (preset: any) => {
    setDcaConfig(preset.dcaConfig);
    setGridConfig(preset.gridConfig);
    addToast(`Loaded config from: ${preset.name}`, "info");
  };

  const runBacktest = () => {
    setIsBacktesting(true);
    // Simulate backtest for multiple strategies to compare
    setTimeout(() => {
      const strategiesToCompare = ["Grid Arbitrage", "DCA Optimizer", "Trend Following"];
      
      const chartDataLength = 30;
      let chartData = Array.from({ length: chartDataLength }, (_, i) => ({ name: `Day ${i + 1}` }));
      
      const results = strategiesToCompare.map(strategy => {
        let currentEquity = parseFloat(backtestParams.capital);
        let maxEquity = currentEquity;
        let maxDrawdown = 0;
        
        for (let i = 0; i < chartDataLength; i++) {
          const dailyChange = Math.floor(Math.random() * 400) - (strategy === "Grid Arbitrage" ? 50 : 100);
          currentEquity += dailyChange;
          
          if (currentEquity > maxEquity) maxEquity = currentEquity;
          const drawdown = ((maxEquity - currentEquity) / maxEquity) * 100;
          if (drawdown > maxDrawdown) maxDrawdown = drawdown;
          
          chartData[i][strategy] = currentEquity;
        }

        return {
          strategy,
          totalProfit: (currentEquity - parseFloat(backtestParams.capital)).toFixed(2),
          drawdown: maxDrawdown.toFixed(2),
          winRate: (Math.random() * 20 + 60).toFixed(2),
          trades: Math.floor(Math.random() * 100 + 50),
        };
      });

      setBacktestResults({ summary: results, chartData });
      setIsBacktesting(false);
      addToast("Backtest comparison sequence completed.", "success");
    }, 2000);
  };

  const downloadCSV = () => {
    const headers = ["Time", "PnL"];
    const rows = pnlHistory.map(h => [h.name, h.pnl]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `performance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Performance report downloaded.", "success");
  };

  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchSafe = (url: string, defaultVal: any) => 
          fetch(url).then(r => r.ok ? r.json() : defaultVal).catch(() => defaultVal);

        const [priceRes, accountRes, statsRes, pnlRes, botsRes] = await Promise.all([
          fetchSafe("/api/market/prices", null),
          fetchSafe("/api/account/summary", null),
          fetchSafe("/api/stats", null),
          fetchSafe("/api/pnl", []),
          fetchSafe("/api/bots", {dca: {}, grid: {}})
        ]);

        if (priceRes) setMarketPrices(priceRes);
        if (statsRes) {
          setStats(statsRes);
          if (telegramConfig.enabled && telegramConfig.pnlThreshold && statsRes.unrealizedTotal !== undefined) {
             const currentUnrealized = parseFloat(statsRes.unrealizedTotal);
             if (accountRes && accountRes.balance > 0) {
               const pnlPercent = (currentUnrealized / accountRes.balance) * 100;
               const threshold = parseFloat(telegramConfig.pnlThreshold);
               
               if (!isNaN(threshold)) {
                  if (lastAlertedPnLRef.current === null) {
                      lastAlertedPnLRef.current = pnlPercent;
                  } else if (Math.abs(pnlPercent - lastAlertedPnLRef.current) >= threshold) {
                      lastAlertedPnLRef.current = pnlPercent;
                      sendTelegramMessage(`🚨 PnL Alert: Unrealized PnL shifted by > ${threshold}%! Current: ${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}% (${currentUnrealized.toFixed(2)})`, false);
                  }
               }
             }
          }
        }
        if (pnlRes && pnlRes.length > 0) setPnlHistory(pnlRes);
        if (botsRes) setActiveBots(botsRes);

        if (accountRes) {
          setAccountSummary(accountRes);
          
          if (!pnlRes || pnlRes.length === 0) {
            setPnlHistory(prev => {
              if (prev.length > 0) {
                const newPoint = { 
                  name: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
                  pnl: accountRes.balance 
                };
                return [...prev.slice(-19), newPoint];
              }
              return Array.from({ length: 20 }, (_, i) => ({
                name: `T-${19 - i}`,
                pnl: accountRes.balance - (Math.random() * 500)
              }));
            });
          }
        }
      } catch (e: any) {
        console.error("Fetch system data failed", e);
      } finally {
        setIsInitialLoad(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const sendTelegramMessage = async (text: string, force = false) => {
    if (!force && !telegramConfig.enabled) return;
    const token = telegramConfig.botToken;
    const chat = telegramConfig.chatId;

    if (!token || !chat) {
        if (force) addToast("Config incomplete: Bot Token and Chat ID required.", "error");
        return;
    }

    try {
        const response = await fetch("/api/telegram/test", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                chatId: chat,
                message: `🚨 *ALPHAQUANT SYSTEM RELAY*\n\n${text}`
            })
        });
        const data = await response.json();
        if (!response.ok && force) throw new Error(data.error || "Telegram API rejection");
        if (force) addToast("Test transmission dispatched successfully.", "success");
    } catch (e: any) {
        if (force) addToast(`Relay Error: ${e.message}`, "error");
    }
  };

  return (
    <div className="flex h-screen bg-[#030406] overflow-hidden font-sans text-slate-300">
      <AnimatePresence>
        {isInitialLoad && (
          <motion.div 
            initial={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#030406] backdrop-blur-xl"
          >
             <div className="flex flex-col items-center gap-6">
                <div className="relative">
                   <div className="w-16 h-16 border-t-2 border-r-2 border-cyan-500 rounded-full animate-spin" />
                   <div className="absolute inset-0 w-16 h-16 border-b-2 border-l-2 border-indigo-500 rounded-full animate-spin direction-reverse" />
                   <Activity className="absolute inset-0 m-auto text-white opacity-50" size={20} />
                </div>
                <div className="text-center">
                   <h2 className="text-sm font-black uppercase text-white tracking-[0.3em]">AlphaQuant</h2>
                   <p className="text-[10px] items-center gap-2 flex font-bold tracking-widest text-slate-500 uppercase mt-2">
                     <Loader2 className="animate-spin" size={10} /> Initializing Engine
                   </p>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#08090C] border-r border-white/5 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)]">
              <Zap size={24} className="text-black fill-current" />
            </div>
            <div>
              <h1 className="text-white font-black text-xl tracking-tighter leading-none italic uppercase">AlphaQuant</h1>
              <div className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">Pro v1.5 Engine</div>
            </div>
          </div>

          <nav className="space-y-2">
            <SidebarLink icon={<TrendingUp size={18} />} label="Live Engine" active={activeTab === "dashboard"} onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }} />
            <SidebarLink icon={<Target size={18} />} label="Strategies" active={activeTab === "strategies"} onClick={() => { setActiveTab("strategies"); setIsSidebarOpen(false); }} />
            <SidebarLink icon={<LineChart size={18} />} label="Backtest" active={activeTab === "backtest"} onClick={() => { setActiveTab("backtest"); setIsSidebarOpen(false); }} />
            <SidebarLink icon={<History size={18} />} label="Trade History" active={activeTab === "history"} onClick={() => { setActiveTab("history"); setIsSidebarOpen(false); }} />
            <SidebarLink icon={<Zap size={18} />} label="Bots / Instances" active={activeTab === "bots"} onClick={() => { setActiveTab("bots"); setIsSidebarOpen(false); }} />
            <SidebarLink icon={<Bell size={18} />} label="Relay Control" active={activeTab === "alerts"} onClick={() => { setActiveTab("alerts"); setIsSidebarOpen(false); }} />
            <SidebarLink icon={<Activity size={18} />} label="System Pulse" active={activeTab === "activity"} onClick={() => { setActiveTab("activity"); setIsSidebarOpen(false); }} />
            <div className="pt-8 mb-4 border-t border-white/5 opacity-50" />
            <SidebarLink icon={<Settings size={18} />} label="Config" active={activeTab === "settings"} onClick={() => { setActiveTab("settings"); setIsSidebarOpen(false); }} />
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#08090C]/50 backdrop-blur-xl z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-8 pl-4">
              <HeaderQuickStat label="Network" value="HL Mainnet" color="text-emerald-500" />
              <HeaderQuickStat label="Latency" value="14ms" color="text-cyan-500" />
              <HeaderQuickStat label="System" value="Nominal" color="text-white" />
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden lg:flex items-center gap-2 bg-[#0A0C10] border border-white/5 px-4 py-2 rounded-xl">
                <Search size={14} className="text-slate-500" />
                <input type="text" placeholder="Search markets..." className="bg-transparent border-none text-[12px] font-black uppercase text-white placeholder-slate-600 focus:ring-0 w-32" />
             </div>
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 p-[1px]">
                <div className="w-full h-full bg-[#08090C] rounded-xl flex items-center justify-center font-black italic text-white text-xs">
                  AQ
                </div>
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 relative">
           <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {activeTab === "dashboard" && (
                <div className="space-y-8">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-4xl font-black text-white italic tracking-tighter mb-2 uppercase">Command Deck</h2>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                        <Activity size={10} className="text-cyan-500 animate-pulse" />
                        Synchronized with Hyperliquid API
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={downloadCSV}
                        className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition-all border border-white/10 flex items-center gap-2 group"
                        title="Download Performance Report"
                      >
                        <Download size={18} className="group-hover:text-cyan-400 transition-colors" />
                      </button>
                      <button onClick={() => addToast("Deployment sequence initiated", "info")} className="px-6 py-3 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-cyan-400 transition-colors shadow-[0_10px_20px_rgba(255,255,255,0.1)]">
                        Initialize Bot
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <RiskMetricCard label="Unrealized PnL" value={`${stats.unrealizedTotal >= 0 ? '+' : ''}$${stats.unrealizedTotal.toFixed(2)}`} trend="" icon={<TrendingUp size={20} />} color={stats.unrealizedTotal >= 0 ? "text-emerald-400" : "text-rose-400"} />
                    <RiskMetricCard label="Deployment Load" value={`${stats.runningBots} / ${stats.totalBots}`} trend="Running strategies" icon={<Cpu size={20} />} color="text-cyan-400" />
                    <RiskMetricCard label="Fill Rate" value={stats.totalOrders > 0 ? `${Math.round((stats.filled / stats.totalOrders) * 100)}%` : '—'} trend={`${stats.filled} / ${stats.totalOrders} filled`} icon={<Activity size={20} />} color="text-slate-400" />
                  </div>

                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                      <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] pointer-events-none group-hover:bg-cyan-500/10 transition-all" />
                        <div className="flex justify-between items-center mb-8">
                            <HeaderQuickStat label="Aggregated Balance" value={`$${stats.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} size="text-2xl" />
                            <div className="flex gap-2">
                              {["1H", "1D", "1W", "1M"].map(t => (
                                <button key={t} className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${t === '1D' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>
                                  {t}
                                </button>
                              ))}
                            </div>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={pnlHistory}>
                                <defs>
                                  <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <Tooltip content={<CustomTooltip />} />
                                <Area 
                                  type="monotone" 
                                  dataKey="pnl" 
                                  stroke="#22d3ee" 
                                  strokeWidth={3}
                                  fillOpacity={1} 
                                  fill="url(#colorPnl)" 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="h-[400px] w-full">
                         <TradingViewChart symbol="HYPE" />
                      </div>
                    </div>

                    <div className="col-span-12 lg:col-span-4 h-full min-h-[500px]">
                       <OrderBook coin="BTC" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-8">
                  <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Operational Config</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 space-y-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Bell className="text-cyan-500" size={20} />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Telegram Relay</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Enable Notifications</span>
                          <button 
                            onClick={() => setTelegramConfig(prev => ({...prev, enabled: !prev.enabled}))}
                            className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${telegramConfig.enabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-all ${telegramConfig.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                        </div>
                        <SettingsInput 
                            label="Bot Token" 
                            type="password" 
                            value={telegramConfig.botToken} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTelegramConfig(prev => ({...prev, botToken: e.target.value}))} 
                            placeholder="7082348503:AAEn..." tooltip="Your Telegram Bot Token obtained from BotFather"
                        />
                        <SettingsInput 
                            label="Chat ID" 
                            type="text" 
                            value={telegramConfig.chatId} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTelegramConfig(prev => ({...prev, chatId: e.target.value}))} 
                            placeholder="73294823" tooltip="The numeric ID of the chat/channel to send messages to"
                        />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button 
                            title="Saves credentials and sends a test message" onClick={() => {
                                addToast("Config synchronized", "success");
                                sendTelegramMessage("Relay Authentication Successful. System Secure.", true);
                            }}
                            className="flex-1 py-4 bg-cyan-500 text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-cyan-400 transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={14} />
                            Save & Test Relay
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8">
                       <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-3">
                          <Layers size={18} className="text-indigo-500" />
                          Risk Parameters
                       </h3>
                       <div className="space-y-4">
                          <SettingsInput label="Global Max Leverage" tooltip="Global cap on maximum leverage allowed across all strategies" value="10.0x" onChange={() => {}} />
                          <SettingsInput label="Slippage Buffer" tooltip="Allowed slippage percentage before order rejection" value="0.5%" onChange={() => {}} />
                          <SettingsInput label="Emergency Kill Switch" tooltip="Immediately halts all running algorithms and closes pending orders" value="Enabled" onChange={() => {}} />
                       </div>
                    </div>

                    <div className="md:col-span-2 bg-[#0A0C10] rounded-3xl border border-white/5 p-8 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                             <Shield size={24} />
                          </div>
                          <div>
                             <h4 className="text-xs font-black uppercase text-white tracking-widest">System Integrity Verified</h4>
                             <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">All engine modules pass audit • Hyperliquid Bridge: ONLINE</p>
                          </div>
                       </div>
                       <button onClick={() => addToast("Integrity report generated", "info")} className="px-4 py-2 bg-white/5 text-[9px] font-black uppercase text-slate-400 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                          Full Audit Log
                       </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "activity" && (
                <div className="space-y-8">
                  <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">System Pulse</h2>
                   <div className="grid grid-cols-12 gap-8">
                      <div className="col-span-12 lg:col-span-8">
                        <GitHubActivityFeed />
                      </div>
                      <div className="col-span-12 lg:col-span-4 bg-[#0A0C10] rounded-3xl border border-white/5 p-8 h-fit">
                         <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Internal Logs</h3>
                         <div className="space-y-4">
                            <LogEntry type="system" time="14:29:11" message="Re-initialized from deep backup" />
                            <LogEntry type="network" time="14:29:20" message="Socket connection restored to HL Mainnet" />
                            <LogEntry type="security" time="14:29:35" message="Multi-sig relay authenticated" />
                            <LogEntry type="trade" time="14:30:05" message="Grid Bot 1 waiting for entry signal" />
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === "alerts" && (
                <div className="space-y-8">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Relay Control</h2>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] flex items-center gap-2 italic">Automated Intervention Thresholds</p>
                    </div>
                    <button onClick={() => addToast("Alert configurations synchronized", "success")} className="px-6 py-3 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-cyan-400 transition-colors">
                        Sync Triggers
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 space-y-6">
                       <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                             <AlertTriangle size={20} />
                          </div>
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Risk Intervention</h3>
                       </div>
                       
                       <div className="space-y-6">
                          <SettingsInput 
                            label="Max Drawdown Threshold (%)" 
                            value={alertThresholds.maxDrawdown} 
                            onChange={(e: any) => setAlertThresholds({...alertThresholds, maxDrawdown: e.target.value})} 
                            placeholder="e.g. 5.0"
                          />
                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight -mt-4 italic">Automatically kills all active positions if drawdown exceeds this limit.</p>
                          
                          <SettingsInput 
                            label="Liquidation Proximity Alert (%)" 
                            value={alertThresholds.liqProximity} 
                            onChange={(e: any) => setAlertThresholds({...alertThresholds, liqProximity: e.target.value})} 
                            placeholder="e.g. 10.0"
                          />
                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight -mt-4 italic">Triggers a high-priority Telegram relay when price within range of liq.</p>
                          <SettingsInput 
                            label="Price Target Alert ($)" 
                            value={alertThresholds.priceTarget} 
                            onChange={(e: any) => setAlertThresholds({...alertThresholds, priceTarget: e.target.value})} 
                            placeholder="e.g. 65000"
                          />
                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight -mt-4 italic">Sends a Telegram notification when asset hits this price.</p>
                          <SettingsInput 
                            label="PnL Change Alert (%)" 
                            value={alertThresholds.pnlChange} 
                            onChange={(e: any) => setAlertThresholds({...alertThresholds, pnlChange: e.target.value})} 
                            placeholder="e.g. 5.0"
                          />
                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight -mt-4 italic">Sends a Telegram notification when PnL moves significantly.</p>
                       </div>
                    </div>

                    <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] pointer-events-none" />
                       <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Recent Trigger Log</h3>
                       <div className="space-y-4">
                          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black uppercase text-white">System Status: Nominal</span>
                             </div>
                             <span className="text-[9px] font-bold text-slate-600 uppercase">Live</span>
                          </div>
                          <LogEntry type="alert" time="04:20:11" message="Relay heartbeat verified across all nodes" />
                          <LogEntry type="alert" time="02:15:45" message="Drawdown threshold adjusted to 5.0%" />
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "bots" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  <div className="flex justify-between items-end">
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Bot Instances</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 space-y-6 relative group overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] pointer-events-none transition-all group-hover:bg-cyan-500/10" />
                      <div className="flex justify-between items-center relative">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                             <Layers size={18} />
                           </div>
                           <div>
                             <h3 className="text-sm font-black uppercase text-white tracking-widest leading-none mb-1">DCA Engine</h3>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Martingale Variant</p>
                           </div>
                        </div>
                        
                        {activeBots?.dca?.['BTC']?.status === 'RUNNING' ? (
                          <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                             <PlayCircle size={14} className="text-cyan-400 animate-pulse" />
                             <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Running — BTC</span>
                          </div>
                        ) : activeBots?.dca?.['BTC']?.status === 'ERROR' ? (
                          <div className="flex items-center gap-2 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                             <AlertCircle size={14} className="text-rose-400" />
                             <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Error — BTC</span>
                          </div>
                        ) : activeBots?.dca?.['BTC']?.status === 'STOPPED' ? (
                          <div className="flex items-center gap-2 bg-slate-500/10 px-3 py-1.5 rounded-full border border-slate-500/20">
                             <StopCircle size={14} className="text-slate-400" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stopped — BTC</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-white/5">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Idle</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Base Asset</span>
                          <span className="text-xs font-black text-white italic">BTC/USD</span>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={async () => {
                            setPendingBotAction('start_dca_btc');
                            try {
                              await fetch('/api/bots/dca', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify(dcaConfig)
                              });
                              // update local state
                              setActiveBots((prev: any) => ({...prev, dca: {...prev.dca, 'BTC': {status: 'RUNNING'}}}));
                              addToast("DCA Engine configured and started", "success");
                            } catch(e) {
                              addToast("Failed to start DCA", "error");
                            }
                            setPendingBotAction(null);
                          }} 
                          disabled={pendingBotAction !== null}
                          title="Start the DCA Engine with the current configuration" className="flex-1 py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center gap-2">
                            {pendingBotAction === 'start_dca_btc' ? <Loader2 className="animate-spin" size={14} /> : null}
                            Start DCA
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={async () => {
                            setPendingBotAction('stop_dca_btc');
                            try {
                              await fetch('/api/bots/dca/stop', { method: 'POST' });
                              setActiveBots((prev: any) => ({...prev, dca: {...prev.dca, 'BTC': {status: 'STOPPED'}}}));
                              addToast("DCA Engine stopped", "info");
                            } catch(e) {
                              addToast("Failed to stop DCA", "error");
                            }
                            setPendingBotAction(null);
                          }} 
                          disabled={pendingBotAction !== null || !activeBots?.dca?.['BTC'] || activeBots?.dca?.['BTC']?.status !== 'RUNNING'}
                          className={`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 ${activeBots?.dca?.['BTC']?.status === 'RUNNING' ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20' : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'}`}>
                            {pendingBotAction === 'stop_dca_btc' ? <Loader2 className="animate-spin" size={14} /> : null}
                            Stop DCA
                        </motion.button>
                      </div>
                    </div>

                    <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 space-y-6 relative group overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] pointer-events-none transition-all group-hover:bg-indigo-500/10" />
                      <div className="flex justify-between items-center relative">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                             <Target size={18} />
                           </div>
                           <div>
                             <h3 className="text-sm font-black uppercase text-white tracking-widest leading-none mb-1">Grid Master</h3>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Multi-level Scalp</p>
                           </div>
                        </div>
                        
                        {activeBots?.grid?.['BTC']?.status === 'RUNNING' ? (
                          <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                             <PlayCircle size={14} className="text-indigo-400 animate-pulse" />
                             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Running — BTC</span>
                          </div>
                        ) : activeBots?.grid?.['BTC']?.status === 'ERROR' ? (
                          <div className="flex items-center gap-2 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                             <AlertCircle size={14} className="text-rose-400" />
                             <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Error — BTC</span>
                          </div>
                        ) : activeBots?.grid?.['BTC']?.status === 'STOPPED' ? (
                          <div className="flex items-center gap-2 bg-slate-500/10 px-3 py-1.5 rounded-full border border-slate-500/20">
                             <StopCircle size={14} className="text-slate-400" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stopped — BTC</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-white/5">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Idle</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Base Asset</span>
                          <span className="text-xs font-black text-white italic">BTC/USD</span>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={async () => {
                            setPendingBotAction('start_grid_btc');
                            try {
                              await fetch('/api/bots/grid', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify(gridConfig)
                              });
                              setActiveBots((prev: any) => ({...prev, grid: {...prev.grid, 'BTC': {status: 'RUNNING'}}}));
                              addToast("Grid Master configured and started", "success");
                            } catch(e) {
                              addToast("Failed to start Grid", "error");
                            }
                            setPendingBotAction(null);
                          }} 
                          disabled={pendingBotAction !== null}
                          className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                            {pendingBotAction === 'start_grid_btc' ? <Loader2 className="animate-spin" size={14} /> : null}
                            Start Grid
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={async () => {
                            setPendingBotAction('stop_grid_btc');
                            try {
                              await fetch('/api/bots/grid/stop', { method: 'POST' });
                              setActiveBots((prev: any) => ({...prev, grid: {...prev.grid, 'BTC': {status: 'STOPPED'}}}));
                              addToast("Grid Master stopped", "info");
                            } catch(e) {
                              addToast("Failed to stop Grid", "error");
                            }
                            setPendingBotAction(null);
                          }} 
                          disabled={pendingBotAction !== null || !activeBots?.grid?.['BTC'] || activeBots?.grid?.['BTC']?.status !== 'RUNNING'}
                          className={`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 ${activeBots?.grid?.['BTC']?.status === 'RUNNING' ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20' : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'}`}>
                            {pendingBotAction === 'stop_grid_btc' ? <Loader2 className="animate-spin" size={14} /> : null}
                            Stop Grid
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "strategies" && (
                <div className="space-y-8">
                  <div className="flex justify-between items-end">
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Strategy Architect</h2>
                  </div>

                  {/* Global Settings & Presets */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 space-y-6">
                      <h3 className="text-xs font-black uppercase text-cyan-500 tracking-widest">Global Defaults</h3>
                      <SettingsInput 
                        label="Default Order Size ($)" tooltip="Fallback size in USD if a strategy encounters an undefined size" 
                        value={globalOrderSize} 
                        onChange={(e: any) => setGlobalOrderSize(e.target.value)} 
                      />
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Fallback if strategy size is undefined</p>
                    </div>

                    <div className="lg:col-span-2 bg-[#0A0C10] rounded-3xl border border-white/5 p-8 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest">Global Presets</h3>
                        <div className="flex gap-2">
                           <input 
                            type="text" 
                            placeholder="Preset Name" 
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-black uppercase text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
                            title="Enter a name to save current DCA and Grid configurations"
                           />
                           <button onClick={savePreset} title="Save current DCA and Grid configurations as a global preset" className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg text-[9px] font-black uppercase border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">Save Config</button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                         {strategyPresets.length === 0 ? (
                           <p className="text-[10px] text-slate-600 font-bold uppercase italic p-2 border border-dashed border-white/5 rounded-xl w-full text-center">No cached presets detected</p>
                         ) : (
                           strategyPresets.map((p, i) => (
                             <div key={i} className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden group hover:border-indigo-500/50 transition-all">
                                <button onClick={() => loadPreset(p)} title="Load this preset" className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-2">
                                  <Lock size={10} className="text-indigo-500" />
                                  {p.name}
                                </button>
                                <button onClick={() => deletePreset(i)} title="Delete preset" className="px-3 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border-l border-white/5">
                                  <X size={10} />
                                </button>
                             </div>
                           ))
                         )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* DCA Strategy */}
                    <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 space-y-6 group hover:border-cyan-500/20 transition-all">
                       <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                               <TrendingUp size={24} />
                            </div>
                            <div>
                               <h3 className="text-lg font-black text-white italic uppercase mb-1">DCA Optimizer</h3>
                               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Dollar Cost Averaging</p>
                            </div>
                          </div>
                          
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <SettingsInput 
                            label="Interval" 
                             value={dcaConfig.interval} 
                             onChange={(e: any) => setDcaConfig({...dcaConfig, interval: e.target.value})} 
                             placeholder="e.g. 1h"
                             tooltip="Time duration between executing consecutive trades in the DCA process"
                          />
                          <SettingsInput 
                            label="Amount ($)" 
                             value={dcaConfig.amount || globalOrderSize} 
                             onChange={(e: any) => setDcaConfig({...dcaConfig, amount: e.target.value})} 
                             placeholder={`Fallback: ${globalOrderSize}`}
                             tooltip="Amount in USD to purchase iteratively"
                          />
                          <SettingsInput 
                            label="Multiplier" 
                            value={dcaConfig.multiplier} 
                            onChange={(e: any) => setDcaConfig({...dcaConfig, multiplier: e.target.value})} 
                            placeholder="e.g. 1.5"
                            tooltip="A multiplier to increase the size of consecutive orders"
                          />
                          <SettingsInput 
                            label="Take-Profit (%)" 
                            value={dcaConfig.takeProfit} 
                            onChange={(e: any) => setDcaConfig({...dcaConfig, takeProfit: e.target.value})} 
                            placeholder="e.g. 5.0"
                            tooltip="Target percentage gain per position"
                          />
                       </div>

                       <div className="pt-4 border-t border-white/5 space-y-4">
                          <h4 className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Margin Architecture</h4>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2 group relative">
                                <label className="text-[9px] font-bold text-slate-700 uppercase flex items-center gap-1 w-max">Mode <span className="flex items-center justify-center w-3 h-3 text-[8px] bg-slate-800 text-slate-400 rounded-full cursor-help hover:text-white hover:bg-slate-700 transition-colors">?</span></label>
                                <div className="flex bg-white/5 rounded-xl p-1">
                                   {['isolated', 'cross'].map(m => (
                                      <button key={m} onClick={() => setDcaConfig({...dcaConfig, marginMode: m})} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${dcaConfig.marginMode === m ? 'bg-cyan-500 text-black' : 'text-slate-500'}`}>{m}</button>
                                   ))}
                                </div>
                                <div className="absolute left-1 bottom-full mb-2 w-max max-w-[200px] z-20 bg-[#08090C] border border-white/10 text-slate-300 text-[10px] p-3 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all hidden group-hover:block shadow-xl whitespace-normal">Isolated margin isolates risk to this bot; cross uses full account balance.</div>
                             </div>
                             <SettingsInput 
                                label="Initial Margin ($)" 
                                value={dcaConfig.initialMargin} 
                                onChange={(e: any) => setDcaConfig({...dcaConfig, initialMargin: e.target.value})} 
                                tooltip="Initial margin needed"
                             />
                          </div>
                       </div>
                       
                       <button 
                          onClick={() => {
                            addToast("DCA template configured. Go to Bots / Instances to start.", "info");
                          }} 
                          className="w-full py-4 bg-white/10 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white/20 transition-all">
                            Save DCA Template
                        </button>
                    </div>

                    {/* Grid Strategy */}
                    <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 space-y-6 group hover:border-indigo-500/20 transition-all">
                       <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                               <Layers size={24} />
                            </div>
                            <div>
                               <h3 className="text-lg font-black text-white italic uppercase mb-1">Grid Master</h3>
                               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Statistical Arbitrage</p>
                            </div>
                          </div>
                          
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <SettingsInput 
                            label="Levels" 
                             value={gridConfig.levels} 
                             onChange={(e: any) => setGridConfig({...gridConfig, levels: e.target.value})} 
                             placeholder="e.g. 10"
                             tooltip="Number of buy and sell orders created across the price action grid"
                          />
                          <SettingsInput 
                            label="Spread (%)" 
                             value={gridConfig.spread} 
                             onChange={(e: any) => setGridConfig({...gridConfig, spread: e.target.value})} 
                             placeholder="e.g. 1.0"
                             tooltip="Distance in percentages between each grid level execution line"
                          />
                          <SettingsInput 
                            label="Size ($)" 
                             value={gridConfig.size || globalOrderSize} 
                             onChange={(e: any) => setGridConfig({...gridConfig, size: e.target.value})} 
                             placeholder={`Fallback: ${globalOrderSize}`}
                             tooltip="Dollar size allocated per grid order"
                          />
                          <SettingsInput 
                            label="Take-Profit (%)" 
                            value={gridConfig.takeProfit} 
                            onChange={(e: any) => setGridConfig({...gridConfig, takeProfit: e.target.value})} 
                            placeholder="e.g. 3.0"
                            tooltip="Execution metric for automated selling per layer"
                          />
                       </div>

                       <div className="pt-4 border-t border-white/5 space-y-4">
                          <h4 className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Margin Architecture</h4>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2 group relative">
                                <label className="text-[9px] font-bold text-slate-700 uppercase flex items-center gap-1 w-max">Mode <span className="flex items-center justify-center w-3 h-3 text-[8px] bg-slate-800 text-slate-400 rounded-full cursor-help hover:text-white hover:bg-slate-700 transition-colors">?</span></label>
                                <div className="flex bg-white/5 rounded-xl p-1">
                                   {['isolated', 'cross'].map(m => (
                                      <button key={m} onClick={() => setGridConfig({...gridConfig, marginMode: m})} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${gridConfig.marginMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{m}</button>
                                   ))}
                                </div>
                                <div className="absolute left-1 bottom-full mb-2 w-max max-w-[200px] z-20 bg-[#08090C] border border-white/10 text-slate-300 text-[10px] p-3 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all hidden group-hover:block shadow-xl whitespace-normal">Isolated margin isolates risk to this grid bot; cross uses full account balance.</div>
                             </div>
                             <SettingsInput 
                                label="Initial Margin ($)" 
                                value={gridConfig.initialMargin} 
                                onChange={(e: any) => setGridConfig({...gridConfig, initialMargin: e.target.value})} 
                                tooltip="Initial margin needed specifically allocated to running the total required grid architecture"
                             />
                          </div>
                       </div>

                       <button 
                          onClick={() => {
                            addToast("Grid template configured. Go to Bots / Instances to start.", "info");
                          }} 
                          className="w-full py-4 bg-indigo-500/20 text-indigo-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-indigo-500/40 transition-all">
                            Save Grid Template
                        </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "backtest" && (
                <div className="space-y-8">
                   <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Backtest Simulator</h2>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] flex items-center gap-2 italic">Historical Probability Engine</p>
                    </div>
                    <button 
                      onClick={runBacktest}
                      disabled={isBacktesting}
                      className={`px-8 py-4 bg-cyan-500 text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-cyan-400 transition-all flex items-center gap-2 ${isBacktesting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isBacktesting ? <Activity className="animate-spin text-black" size={16} /> : <Play size={16} />}
                      {isBacktesting ? "Processing..." : "Run Simulation"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1 bg-[#0A0C10] rounded-3xl border border-white/5 p-8 space-y-6">
                       <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-6">Parameters</h3>
                       <div className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Algorithm</label>
                             <select 
                                value={backtestParams.strategy}
                                onChange={(e) => setBacktestParams({...backtestParams, strategy: e.target.value})}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-xs font-black italic text-white focus:outline-none focus:border-cyan-500/50 appearance-none uppercase tracking-widest"
                             >
                                <option value="grid">Grid Arbitrage</option>
                                <option value="dca">DCA Optimizer</option>
                                <option value="trend">Trend Following</option>
                             </select>
                          </div>
                          <SettingsInput 
                            label="Initial Capital ($)" 
                            value={backtestParams.capital} 
                            onChange={(e: any) => setBacktestParams({...backtestParams, capital: e.target.value})}
                          />
                          <SettingsInput 
                            label="Start Date" 
                            type="date"
                            value={backtestParams.startDate} 
                            onChange={(e: any) => setBacktestParams({...backtestParams, startDate: e.target.value})}
                          />
                          <SettingsInput 
                            label="End Date" 
                            type="date"
                            value={backtestParams.endDate} 
                            onChange={(e: any) => setBacktestParams({...backtestParams, endDate: e.target.value})}
                          />
                       </div>
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                       {backtestResults ? (
                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                               {backtestResults.summary.map((res: any, idx: number) => (
                                 <div key={idx} className="bg-[#0A0C10] rounded-2xl border border-white/5 p-6 group">
                                     <h4 className="text-xs font-black uppercase text-white tracking-widest mb-4 flex items-center justify-between">
                                        {res.strategy}
                                        <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-indigo-500' : idx === 1 ? 'bg-cyan-500' : 'bg-emerald-500'}`} />
                                     </h4>
                                     <div className="grid grid-cols-2 gap-4">
                                        <div>
                                           <div className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Net Profit</div>
                                           <div className={`text-lg font-black ${parseFloat(res.totalProfit) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{parseFloat(res.totalProfit) >= 0 ? '+' : ''}${res.totalProfit}</div>
                                        </div>
                                        <div>
                                           <div className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Max Drawdown</div>
                                           <div className="text-lg font-black text-rose-500">{res.drawdown}%</div>
                                        </div>
                                        <div>
                                           <div className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Win Rate</div>
                                           <div className="text-sm font-black text-slate-300">{res.winRate}%</div>
                                        </div>
                                        <div>
                                           <div className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Trades</div>
                                           <div className="text-sm font-black text-slate-300">{res.trades}</div>
                                        </div>
                                     </div>
                                 </div>
                               ))}
                            </div>
                            <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 h-[450px] space-y-6">
                               <div className="flex justify-between items-center">
                                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Comparative Equity Curve</h4>
                                  <div className="flex gap-4">
                                     {backtestResults.summary.map((res: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-indigo-500' : idx === 1 ? 'bg-cyan-500' : 'bg-emerald-500'}`} />
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{res.strategy}</span>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                               <ResponsiveContainer width="100%" height="80%">
                                  <AreaChart data={backtestResults.chartData}>
                                     <defs>
                                        <linearGradient id="equityGradient1" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="equityGradient2" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.1}/>
                                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="equityGradient3" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                     </defs>
                                     <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                     <XAxis dataKey="name" hide />
                                     <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                                     <Tooltip content={<CustomTooltip />} />
                                     <Area type="monotone" dataKey="Grid Arbitrage" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#equityGradient1)" />
                                     <Area type="monotone" dataKey="DCA Optimizer" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#equityGradient2)" />
                                     <Area type="monotone" dataKey="Trend Following" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#equityGradient3)" />
                                  </AreaChart>
                               </ResponsiveContainer>
                            </div>
                         </motion.div>
                       ) : (
                         <div className="h-full flex items-center justify-center p-8 bg-[#0A0C10] rounded-3xl border border-dashed border-white/5">
                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic text-center w-64 leading-relaxed">
                               Awaiting configuration. Trigger the simulation to aggregate historical data.
                            </p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-8 flex flex-col h-full">
                  <div className="flex justify-between items-end">
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Trade History</h2>
                    <button onClick={exportTradesCSV} className="px-6 py-3 bg-white/5 border border-white/10 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all flex items-center gap-2">
                       <Download size={16} />
                       Export CSV
                    </button>
                  </div>

                  <div className="bg-[#0A0C10] rounded-3xl border border-white/5 overflow-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] sticky top-0 backdrop-blur-md">
                          {["Time", "Symbol", "Side", "Size", "Price", "Realized PnL"].map(h => (
                            <th key={h} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 ${(h === 'Size' || h === 'Price' || h === 'Realized PnL') ? 'text-right' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {tradeHistory.length === 0 ? (
                           <tr><td colSpan={6} className="py-8 text-center text-sm font-bold text-slate-500 italic">No trades recorded</td></tr>
                        ) : tradeHistory.map((trade: any, i: number) => (
                           <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                              <td className="px-6 py-4 text-[10px] font-mono text-slate-500 whitespace-nowrap">{new Date(trade.timestamp).toLocaleString()}</td>
                              <td className="px-6 py-4 text-xs font-black text-white italic">{trade.symbol}</td>
                              <td className="px-6 py-4">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm ${trade.side === 'buy' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                   {trade.side.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-mono text-slate-200 text-right">{trade.size}</td>
                              <td className="px-6 py-4 text-xs font-mono text-slate-200 text-right">${parseFloat(trade.price).toLocaleString()}</td>
                              <td className={`px-6 py-4 text-xs font-mono font-black italic text-right ${trade.pnl > 0 ? 'text-cyan-500' : trade.pnl < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                                 {trade.pnl > 0 ? '+' : ''}{trade.pnl.toLocaleString()}
                              </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
           </AnimatePresence>
        </div>
      </main>

      {/* Toast Overlay */}
      <div className="fixed bottom-8 right-8 z-[100] space-y-4 max-w-sm pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20, filter: "blur(5px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.9, filter: "blur(5px)" }}
              className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-3xl flex items-center gap-4 ${
                t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100' : 
                t.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-100' : 
                'bg-cyan-500/10 border-cyan-500/20 text-cyan-100'
              }`}
            >
              {t.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-500" /> : 
               t.type === 'error' ? <AlertTriangle size={18} className="text-rose-500" /> : 
               <Bell size={18} className="text-cyan-500" />}
              <span className="text-[10px] font-black uppercase tracking-widest">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
        active ? 'bg-cyan-500/10 text-white shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]' : 'text-slate-500 hover:text-white hover:bg-white/5'
      }`}
    >
      <div className={`${active ? 'text-cyan-500' : 'text-slate-600 group-hover:text-cyan-400'}`}>
        {icon}
      </div>
      <span className={`text-xs font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
      {active && (
        <motion.div layoutId="nav-indicator" className="absolute left-0 w-1 h-6 bg-cyan-500 rounded-full" />
      )}
    </button>
  );
}

function HeaderQuickStat({ label, value, color = "text-white", size = "text-sm" }: any) {
  return (
    <div className="flex flex-col">
       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
       <span className={`${size} font-black ${color} italic tracking-tighter`}>{value}</span>
    </div>
  );
}

function RiskMetricCard({ label, value, trend, icon, color }: any) {
  return (
    <div className="bg-[#0A0C10] rounded-2xl border border-white/5 p-6 flex items-center justify-between group hover:border-white/10 transition-all">
       <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          <div>
            <div className="text-[9px] font-black uppercase text-slate-600 tracking-widest mb-1">{label}</div>
            <div className="text-lg font-black text-white italic tracking-tighter leading-none">{value}</div>
          </div>
       </div>
       <div className="text-right">
          <div className={`text-[10px] font-black uppercase ${trend.startsWith('-') ? 'text-rose-500' : trend === 'Steady' ? 'text-slate-500' : 'text-emerald-500'}`}>
            {trend}
          </div>
          <div className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">24H Delta</div>
       </div>
    </div>
  );
}

function SettingsInput({ label, value, onChange, type = "text", placeholder = "", tooltip = "" }: any) {
  return (
    <div className="space-y-2 relative group flex flex-col">
      <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1 flex items-center gap-1 w-max">
        {label}
        {tooltip && (
          <div className="flex items-center justify-center w-3 h-3 text-[8px] bg-slate-800 text-slate-400 rounded-full cursor-help hover:text-white hover:bg-slate-700 transition-colors">?</div>
        )}
      </label>
      <input 
        type={type} 
        value={value} 
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-xs font-black italic text-white placeholder-slate-700 focus:outline-none focus:border-cyan-500/50 transition-colors" 
      />
      {tooltip && (
        <div className="absolute left-1 bottom-full mb-2 w-max max-w-[200px] z-20 bg-[#08090C] border border-white/10 text-slate-300 text-[10px] p-3 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all hidden group-hover:block whitespace-normal shadow-xl">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function LogEntry({ type, time, message }: any) {
  return (
    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
       <div className="flex justify-between items-center mb-1">
          <span className="text-[8px] font-black uppercase text-slate-600">{time}</span>
          <span className={`text-[8px] font-black uppercase tracking-widest ${type === 'trade' ? 'text-cyan-500' : 'text-slate-500'}`}>{type}</span>
       </div>
       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{message}</p>
    </div>
  );
}

function GitHubActivityFeed() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const response = await fetch("/api/updates/github").catch(() => null);
        if (!response || !response.ok) throw new Error("Proxy error");
        const data = await response.json();
        // Fallback for empty/error data
        if (!Array.isArray(data)) throw new Error("Invalid format");
        setUpdates(data);
      } catch (e: any) {
        setUpdates([
          { sha: '1', commit: { message: "System sync: Deployment conflicts settled in build v1.5.0" }, author: { login: "alpha-core" } },
          { sha: '2', commit: { message: "Security patch: Risk management safeguard threshold update" }, author: { login: "quant-lead" } },
          { sha: '3', commit: { message: "Reconciliation: Improved exchange-local database sync" }, author: { login: "db-admin" } },
          { sha: '4', commit: { message: "UI: Integrated project pulse intelligence feed" }, author: { login: "ux-quant" } }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchUpdates();
  }, []);

  return (
    <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
       <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-500 mb-1">Project pulse</h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Core Upstream Sync</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <Activity size={16} className="text-cyan-500 animate-pulse" />
          </div>
       </div>

       <div className="space-y-6">
          {updates.map((u, idx) => (
            <div key={u.sha || idx} className="flex gap-4">
               <div className="text-[10px] items-center flex flex-col">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden grayscale">
                     <img src={u.author?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.author?.login || 'ai'}`} alt="a" className="w-full h-full" referrerPolicy="no-referrer" />
                  </div>
                  {idx !== updates.length - 1 && <div className="w-[1px] flex-1 bg-white/5 mt-2" />}
               </div>
               <div className="flex-1 pb-4 border-b border-white/[0.02]">
                  <p className="text-[11px] text-white font-black italic mb-0.5 tracking-tight">{u.commit?.message}</p>
                  <p className="text-[8px] text-slate-600 uppercase font-bold tracking-[0.2em]">@{u.author?.login || 'system'} sync</p>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#08090C] border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
        <p className="text-sm font-black italic text-cyan-400 tracking-tighter">${payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
}

function TradingViewChart({ symbol }: { symbol: string }) {
  const containerId = `tv_${symbol}_${Math.random().toString(36).substring(7)}`;

  useEffect(() => {
    let tvScript = document.getElementById('tv-script') as HTMLScriptElement;
    
    const initWidget = () => {
      if (typeof (window as any).TradingView !== 'undefined') {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: `COINBASE:${symbol}USD`,
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          backgroundColor: "#08090c",
          gridColor: "rgba(255, 255, 255, 0.05)",
          container_id: containerId,
          hide_legend: true,
          save_image: false,
        });
      }
    };

    if (!tvScript) {
      tvScript = document.createElement('script');
      tvScript.id = 'tv-script';
      tvScript.src = 'https://s3.tradingview.com/tv.js';
      tvScript.async = true;
      tvScript.onload = initWidget;
      document.head.appendChild(tvScript);
    } else {
      initWidget();
    }

  }, [symbol, containerId]);

  return (
    <div 
      className="w-full h-full bg-[#08090C] rounded-3xl overflow-hidden border border-white/5" 
      id={containerId} 
    />
  );
}

export default App;
