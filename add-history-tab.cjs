const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add Download icon to lucide-react import
if (!code.includes('Download,')) {
  code = code.replace(/import \{ /, "import { Download, ");
}

// 2. Add history state
if (!code.includes('tradeHistory')) {
  code = code.replace(/const \[activeBots, setActiveBots\] = useState<any>/, "const [tradeHistory, setTradeHistory] = useState<any[]>([]);\n  const [activeBots, setActiveBots] = useState<any>");
}

// 3. fetch history in fetchData
// Assuming the array of promises is inside fetchData
if (!code.includes('fetchSafe("/api/history"')) {
  code = code.replace(/fetchSafe\("\/api\/bots", \{dca: \{\}, grid: \{\}\}\)/, 'fetchSafe("/api/bots", {dca: {}, grid: {}}),\n          fetchSafe("/api/history", [])');
  
  // also modify array destructuring
  code = code.replace(/const \[priceRes, accountRes, statsRes, pnlRes, botsRes\] = await Promise.all/, 'const [priceRes, accountRes, statsRes, pnlRes, botsRes, historyRes] = await Promise.all');
  
  // also set history
  code = code.replace(/if \(botsRes\) setActiveBots\(botsRes\);/, 'if (botsRes) setActiveBots(botsRes);\n        if (historyRes) setTradeHistory(historyRes);');
}

// 4. Add the History Tab content
const targetHistoryTab = `{activeTab === "history" && (`;
const replaceHistoryTab = `{activeTab === "history" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 h-full flex flex-col">
                  <div className="flex justify-between items-end">
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Trade Log</h2>
                    <button 
                      onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8," + 
                          "ID,Timestamp,Date,Symbol,Side,Size,Price,Realized PnL\\n" + 
                          tradeHistory.map(t => \`\${t.id},\${t.timestamp},\${new Date(t.timestamp).toLocaleString()},\${t.symbol},\${t.side},\${t.size},\${t.price},\${t.pnl}\`).join("\\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", "alphaquant_trades.csv");
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        addToast("Trade history exported", "success");
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10 flex items-center gap-2"
                    >
                      <Download size={14} /> Export CSV
                    </button>
                  </div>

                  <div className="bg-[#0A0C10] rounded-3xl border border-white/5 p-8 flex-1 overflow-auto relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] pointer-events-none transition-all group-hover:bg-cyan-500/10" />
                    <table className="w-full text-left border-collapse relative z-10">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                          <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Symbol</th>
                          <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Side</th>
                          <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Size</th>
                          <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Price</th>
                          <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Realized PnL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradeHistory.length === 0 ? (
                          <tr><td colSpan={6} className="py-8 text-center text-sm font-bold text-slate-500 italic">No trades found in DB</td></tr>
                        ) : tradeHistory.map((trade: any, i: number) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 text-xs font-bold text-slate-400">
                              {new Date(trade.timestamp).toLocaleString()}
                            </td>
                            <td className="py-4 text-xs font-black text-white">
                              {trade.symbol}
                            </td>
                            <td className="py-4 text-right">
                              <span className={\`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md \${trade.side === 'buy' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-rose-500/10 text-rose-400'}\`}>
                                {trade.side}
                              </span>
                            </td>
                            <td className="py-4 text-xs font-bold text-slate-300 text-right">
                              {trade.size}
                            </td>
                            <td className="py-4 text-xs font-bold text-white text-right">
                              ${parseFloat(trade.price).toLocaleString()}
                            </td>
                            <td className={\`py-4 text-xs font-black text-right \${trade.pnl > 0 ? 'text-cyan-400' : trade.pnl < 0 ? 'text-rose-400' : 'text-slate-500'}\`}>
                              {trade.pnl > 0 ? '+' : ''}{parseFloat(trade.pnl).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === "alerts" && (`;

code = code.replace(targetHistoryTab, replaceHistoryTab);

fs.writeFileSync('src/App.tsx', code);
