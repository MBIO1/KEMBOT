const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const historyStart = '{activeTab === "history" && (';
const historyEnd = '              )}';

const startIdx = code.indexOf(historyStart);
const endIdx = code.indexOf(historyEnd, startIdx) + historyEnd.length;

if (startIdx !== -1 && endIdx !== -1) {
    const replaceHistoryTab = `{activeTab === "history" && (
                <div className="space-y-8 flex flex-col h-full">
                  <div className="flex justify-between items-end">
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Execution Ledger</h2>
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
                            <th key={h} className={\`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 \${(h === 'Size' || h === 'Price' || h === 'Realized PnL') ? 'text-right' : ''}\`}>{h}</th>
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
                                <span className={\`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm \${trade.side === 'buy' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-rose-500/10 text-rose-400'}\`}>
                                   {trade.side.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-mono text-slate-200 text-right">{trade.size}</td>
                              <td className="px-6 py-4 text-xs font-mono text-slate-200 text-right">\${parseFloat(trade.price).toLocaleString()}</td>
                              <td className={\`px-6 py-4 text-xs font-mono font-black italic text-right \${trade.pnl > 0 ? 'text-cyan-500' : trade.pnl < 0 ? 'text-rose-500' : 'text-slate-500'}\`}>
                                 {trade.pnl > 0 ? '+' : ''}{trade.pnl.toLocaleString()}
                              </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}`;
    
    code = code.slice(0, startIdx) + replaceHistoryTab + code.slice(endIdx);
    fs.writeFileSync('src/App.tsx', code);
}
