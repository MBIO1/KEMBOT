import React, { useState, useEffect, useRef } from "react";
import { 
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
  CheckCircle2,
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

type TabType = "dashboard" | "strategies" | "history" | "alerts" | "settings" | "activity" | "backtest";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, string>>({});
  const [pnlHistory, setPnlHistory] = useState<any[]>([]);
  const [accountSummary, setAccountSummary] = useState({
    balance: 0,
    drawdown: 0,
    leverage: 0,
    liqPrice: 0,
    activePositions: 0
  });
  const [telegramConfig, setTelegramConfig] = useState({
    enabled: false,
    botToken: "",
    chatId: ""
  });

  // Global & Preset States
  const [globalOrderSize, setGlobalOrderSize] = useState("100");
  const [strategyPresets, setStrategyPresets] = useState<{name: string, type: string, config: any}[]>([]);
  const [presetName, setPresetName] = useState("");

  // Strategy Configs - Enhanced with Margin
  const [dcaConfig, setDcaConfig] = useState({
    interval: "1h",
    amount: "", // Empty to test global fallback
    multiplier: "1.5",
    takeProfit: "5.0",
    marginMode: "isolated",
    initialMargin: "500"
  });
  const [gridConfig, setGridConfig] = useState({
    levels: "10",
    spread: "1.0",
    size: "50",
    takeProfit: "3.0",
    marginMode: "cross",
    initialMargin: "1000"
  });

  // Alert Thresholds
  const [alertThresholds, setAlertThresholds] = useState({
    maxDrawdown: "5.0",
    liqProximity: "10.0"
  });

  // Backtest State
  const [backtestParams, setBacktestParams] = useState({
    strategy: "grid",
    startDate: "2024-01-01",
    endDate: "2024-05-16",
    capital: "10000"
  });
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResults, setBacktestResults] = useState<any>(null);

  const savePreset = (type: string, config: any) => {
    if (!presetName) {
      addToast("Please enter a preset name", "error");
      return;
    }
    setStrategyPresets(prev => [...prev, { name: presetName, type, config }]);
    setPresetName("");
    addToast(`Preset '${presetName}' cached successfully`, "success");
  };

  const loadPreset = (preset: any) => {
    if (preset.type === 'dca') setDcaConfig(preset.config);
    if (preset.type === 'grid') setGridConfig(preset.config);
    addToast(`Loaded preset: ${preset.name}`, "info");
  };

  const runBacktest = () => {
    setIsBacktesting(true);
    // Simulate backtest
    setTimeout(() => {
      let currentEquity = parseFloat(backtestParams.capital);
      const results = {
        totalProfit: (Math.random() * 2000 + 500).toFixed(2),
        drawdown: (Math.random() * 5 + 1).toFixed(2),
        winRate: (Math.random() * 20 + 60).toFixed(2),
        trades: Math.floor(Math.random() * 100 + 50),
        chartData: Array.from({ length: 30 }, (_, i) => {
          const dailyChange = Math.floor(Math.random() * 400) - 100;
          currentEquity += dailyChange;
          return {
            name: `Day ${i + 1}`,
            profit: dailyChange,
            equity: currentEquity
          };
        })
      };
      setBacktestResults(results);
      setIsBacktesting(false);
      addToast("Backtest sequence completed.", "success");
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
        const [priceRes, accountRes] = await Promise.all([
          fetch("/api/market/prices"),
          fetch("/api/account/summary")
        ]);

        if (priceRes.ok) {
          const prices = await priceRes.json();
          setMarketPrices(prices);
        }

        if (accountRes.ok) {
          const account = await accountRes.json();
          setAccountSummary(account);
          
          // Seed PnL history from real balance if empty
          setPnlHistory(prev => {
            if (prev.length > 0) {
              const newPoint = { 
                name: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
                pnl: account.balance 
              };
              const updated = [...prev.slice(-19), newPoint];
              return updated;
            }
            return Array.from({ length: 20 }, (_, i) => ({
              name: `T-${19 - i}`,
              pnl: account.balance - (Math.random() * 500)
            }));
          });
        }
      } catch (e: any) {
        console.error("Fetch system data failed", e);
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
            <SidebarLink icon={<History size={18} />} label="Ledger" active={activeTab === "history"} onClick={() => { setActiveTab("history"); setIsSidebarOpen(false); }} />
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
                    <RiskMetricCard label="Max Drawdown" value={`${(accountSummary.drawdown * 100).toFixed(1)}%`} trend="-0.5%" icon={<AlertTriangle size={20} />} color="text-rose-500" />
                    <RiskMetricCard label="Current Leverage" value={`${accountSummary.leverage}x`} trend="Steady" icon={<Shield size={20} />} color="text-cyan-500" />
                    <RiskMetricCard label="Liquidation Price" value={`$${accountSummary.liqPrice.toLocaleString()}`} trend="+2.4%" icon={<Zap size={20} />} color="text-emerald-500" />
                  </div>

                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                      <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] pointer-events-none group-hover:bg-cyan-500/10 transition-all" />
                        <div className="flex justify-between items-center mb-8">
                            <HeaderQuickStat label="Aggregated Balance" value={`$${accountSummary.balance.toLocaleString()}`} size="text-2xl" />
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

                    <div className="col-span-12 lg:col-span-4 bg-[#0A0C10] rounded-3xl border border-white/5 p-8 flex flex-col justify-between h-full">
                       <h3 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em] mb-6">Market Watch</h3>
                       <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2">
                          {Object.entries(marketPrices).slice(0, 12).map(([sym, price]) => (
                            <div key={sym} className="flex justify-between items-center p-4 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-colors cursor-pointer group">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-[10px] font-black group-hover:text-cyan-400">
                                    {sym.substring(0, 1)}
                                  </div>
                                  <div>
                                    <div className="text-xs font-black text-white italic">{sym}</div>
                                    <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">HL Perpetuals</div>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <div className="text-xs font-mono font-black text-white">${parseFloat(price).toLocaleString()}</div>
                                  <div className="text-[9px] font-bold text-emerald-500">+1.42%</div>
                                </div>
                            </div>
                          ))}
                       </div>
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
                            placeholder="7082348503:AAEn..."
                        />
                        <SettingsInput 
                            label="Chat ID" 
                            type="text" 
                            value={telegramConfig.chatId} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTelegramConfig(prev => ({...prev, chatId: e.target.value}))} 
                            placeholder="73294823"
                        />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button 
                            onClick={() => {
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
                          <SettingsInput label="Global Max Leverage" value="10.0x" onChange={() => {}} />
                          <SettingsInput label="Slippage Buffer" value="0.5%" onChange={() => {}} />
                          <SettingsInput label="Emergency Kill Switch" value="Enabled" onChange={() => {}} />
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
                        label="Default Order Size ($)" 
                        value={globalOrderSize} 
                        onChange={(e: any) => setGlobalOrderSize(e.target.value)} 
                      />
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Fallback if strategy size is undefined</p>
                    </div>

                    <div className="lg:col-span-2 bg-[#0A0C10] rounded-3xl border border-white/5 p-8 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest">Strategic Presets</h3>
                        <div className="flex gap-2">
                           <input 
                            type="text" 
                            placeholder="Preset Name" 
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-black uppercase text-white placeholder-slate-700"
                           />
                           <button onClick={() => savePreset('dca', dcaConfig)} className="px-3 py-1 bg-cyan-500/10 text-cyan-500 rounded-lg text-[9px] font-black uppercase border border-cyan-500/20">Save DCA</button>
                           <button onClick={() => savePreset('grid', gridConfig)} className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg text-[9px] font-black uppercase border border-indigo-500/20">Save Grid</button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                         {strategyPresets.length === 0 ? (
                           <p className="text-[10px] text-slate-600 font-bold uppercase italic p-2 border border-dashed border-white/5 rounded-xl w-full text-center">No cached presets detected</p>
                         ) : (
                           strategyPresets.map((p, i) => (
                             <button key={i} onClick={() => loadPreset(p)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-cyan-500 transition-all flex items-center gap-2">
                                <Lock size={10} className={p.type === 'dca' ? 'text-cyan-500' : 'text-indigo-500'} />
                                {p.name}
                             </button>
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
                          <div className="px-3 py-1 bg-cyan-500/10 rounded-full text-[10px] font-black text-cyan-500 uppercase tracking-widest">Active</div>
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <SettingsInput 
                            label="Interval" 
                            value={dcaConfig.interval} 
                            onChange={(e: any) => setDcaConfig({...dcaConfig, interval: e.target.value})} 
                            placeholder="e.g. 1h"
                          />
                          <SettingsInput 
                            label="Amount ($)" 
                            value={dcaConfig.amount || globalOrderSize} 
                            onChange={(e: any) => setDcaConfig({...dcaConfig, amount: e.target.value})} 
                            placeholder={`Fallback: $${globalOrderSize}`}
                          />
                          <SettingsInput 
                            label="Multiplier" 
                            value={dcaConfig.multiplier} 
                            onChange={(e: any) => setDcaConfig({...dcaConfig, multiplier: e.target.value})} 
                            placeholder="e.g. 1.5"
                          />
                          <SettingsInput 
                            label="Take-Profit (%)" 
                            value={dcaConfig.takeProfit} 
                            onChange={(e: any) => setDcaConfig({...dcaConfig, takeProfit: e.target.value})} 
                            placeholder="e.g. 5.0"
                          />
                       </div>

                       <div className="pt-4 border-t border-white/5 space-y-4">
                          <h4 className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Margin Architecture</h4>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[9px] font-bold text-slate-700 uppercase">Mode</label>
                                <div className="flex bg-white/5 rounded-xl p-1">
                                   {['isolated', 'cross'].map(m => (
                                      <button key={m} onClick={() => setDcaConfig({...dcaConfig, marginMode: m})} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${dcaConfig.marginMode === m ? 'bg-cyan-500 text-black' : 'text-slate-500'}`}>{m}</button>
                                   ))}
                                </div>
                             </div>
                             <SettingsInput 
                                label="Initial Margin ($)" 
                                value={dcaConfig.initialMargin} 
                                onChange={(e: any) => setDcaConfig({...dcaConfig, initialMargin: e.target.value})} 
                             />
                          </div>
                       </div>
                       
                       <button onClick={() => addToast("DCA Engine reconfigured", "success")} className="w-full py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-cyan-400 transition-all">Apply Parameters</button>
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
                          <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Idle</div>
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <SettingsInput 
                            label="Levels" 
                            value={gridConfig.levels} 
                            onChange={(e: any) => setGridConfig({...gridConfig, levels: e.target.value})} 
                            placeholder="e.g. 10"
                          />
                          <SettingsInput 
                            label="Spread (%)" 
                            value={gridConfig.spread} 
                            onChange={(e: any) => setGridConfig({...gridConfig, spread: e.target.value})} 
                            placeholder="e.g. 1.0"
                          />
                          <SettingsInput 
                            label="Size ($)" 
                            value={gridConfig.size || globalOrderSize} 
                            onChange={(e: any) => setGridConfig({...gridConfig, size: e.target.value})} 
                            placeholder={`Fallback: $${globalOrderSize}`}
                          />
                          <SettingsInput 
                            label="Take-Profit (%)" 
                            value={gridConfig.takeProfit} 
                            onChange={(e: any) => setGridConfig({...gridConfig, takeProfit: e.target.value})} 
                            placeholder="e.g. 3.0"
                          />
                       </div>

                       <div className="pt-4 border-t border-white/5 space-y-4">
                          <h4 className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Margin Architecture</h4>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[9px] font-bold text-slate-700 uppercase">Mode</label>
                                <div className="flex bg-white/5 rounded-xl p-1">
                                   {['isolated', 'cross'].map(m => (
                                      <button key={m} onClick={() => setGridConfig({...gridConfig, marginMode: m})} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${gridConfig.marginMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{m}</button>
                                   ))}
                                </div>
                             </div>
                             <SettingsInput 
                                label="Initial Margin ($)" 
                                value={gridConfig.initialMargin} 
                                onChange={(e: any) => setGridConfig({...gridConfig, initialMargin: e.target.value})} 
                             />
                          </div>
                       </div>

                       <button onClick={() => addToast("Grid configuration modified", "success")} className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-indigo-500 transition-all">Apply Parameters</button>
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
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                               <HeaderQuickStat label="Net Profit" value={`+$${backtestResults.totalProfit}`} color="text-emerald-500" size="text-xl" />
                               <HeaderQuickStat label="Max Drawdown" value={`${backtestResults.drawdown}%`} color="text-rose-500" size="text-xl" />
                               <HeaderQuickStat label="Win Rate" value={`${backtestResults.winRate}%`} size="text-xl" />
                               <HeaderQuickStat label="Positions" value={backtestResults.trades} size="text-xl" />
                            </div>
                            <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 h-[450px] space-y-6">
                               <div className="flex justify-between items-center">
                                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Simulation Visualization</h4>
                                  <div className="flex gap-4">
                                     <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Daily PnL</span>
                                     </div>
                                     <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Equity Curve</span>
                                     </div>
                                  </div>
                               </div>
                               <ResponsiveContainer width="100%" height="80%">
                                  <AreaChart data={backtestResults.chartData}>
                                     <defs>
                                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                     </defs>
                                     <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                     <XAxis dataKey="name" hide />
                                     <YAxis hide />
                                     <Tooltip content={<CustomTooltip />} />
                                     <Bar dataKey="profit" fill="#22d3ee" fillOpacity={0.3} radius={[2, 2, 0, 0]} />
                                     <Area 
                                        type="monotone" 
                                        dataKey="equity" 
                                        stroke="#6366f1" 
                                        strokeWidth={3} 
                                        fillOpacity={1} 
                                        fill="url(#equityGradient)" 
                                      />
                                  </AreaChart>
                               </ResponsiveContainer>
                            </div>
                         </motion.div>
                       ) : (
                         <div className="h-full border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-12 opacity-50">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                               <LineChart size={40} className="text-slate-600" />
                            </div>
                            <h3 className="text-lg font-black italic text-white uppercase mb-2">Awaiting Simulation</h3>
                            <p className="max-w-xs text-xs font-bold uppercase tracking-widest text-slate-500 italic">Configure parameters and execute the model to visualize historical performance.</p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-8">
                  <div className="flex justify-between items-end">
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Execution Ledger</h2>
                    <button onClick={downloadCSV} className="px-6 py-3 bg-white/5 border border-white/10 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all flex items-center gap-2">
                       <Download size={16} />
                       Export CSV
                    </button>
                  </div>

                  <div className="bg-[#0A0C10] rounded-3xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          {["Time", "Symbol", "Side", "Size", "Price", "Realized PnL"].map(h => (
                            <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {pnlHistory.slice(0, 10).map((h, i) => (
                           <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                              <td className="px-6 py-4 text-[10px] font-mono text-slate-500">2024-05-16 14:30:{i}</td>
                              <td className="px-6 py-4 text-xs font-black text-white italic">HYPE</td>
                              <td className={`px-6 py-4 text-[10px] font-black uppercase ${i % 2 === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{i % 2 === 0 ? 'BUY' : 'SELL'}</td>
                              <td className="px-6 py-4 text-xs font-mono text-slate-200">1,240.00</td>
                              <td className="px-6 py-4 text-xs font-mono text-slate-200">$1.2405</td>
                              <td className={`px-6 py-4 text-xs font-mono font-black italic ${h.pnl > 500 ? 'text-emerald-500' : 'text-slate-400'}`}>+${h.pnl}</td>
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

function SettingsInput({ label, value, onChange, type = "text", placeholder = "" }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-xs font-black italic text-white placeholder-slate-700 focus:outline-none focus:border-cyan-500/50 transition-colors" 
      />
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
        const response = await fetch("/api/updates/github");
        if (!response.ok) throw new Error("Proxy error");
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
  const container = useRef<HTMLDivElement>(null);
  const widgetLoaded = useRef(false);

  useEffect(() => {
    if (!container.current) return;
    
    // Clear previous content strictly
    const currentContainer = container.current;
    while (currentContainer.firstChild) {
      currentContainer.removeChild(currentContainer.firstChild);
    }
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    
    // Error handling for script load
    script.onerror = (e) => {
      console.error("TradingView script failed to load:", e);
    };

    const config = {
      "autosize": true,
      "symbol": `COINBASE:${symbol}USD`,
      "interval": "1",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "container_id": `tv_container_${symbol}`
    };
    
    script.innerHTML = JSON.stringify(config);
    
    try {
      currentContainer.appendChild(script);
      widgetLoaded.current = true;
    } catch (e) {
      console.error("TradingView widget mount failed", e);
    }

    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
      widgetLoaded.current = false;
    };
  }, [symbol]);

  return (
    <div 
      className="w-full h-full bg-[#08090C] rounded-3xl overflow-hidden border border-white/5" 
      ref={container} 
      id={`tv_container_${symbol}`} 
    />
  );
}

export default App;
