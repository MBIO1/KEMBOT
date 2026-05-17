const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add tradeHistory state
if (!code.includes('tradeHistory')) {
  code = code.replace(/const \[activeBots, setActiveBots\] = useState<any>/, "const [tradeHistory, setTradeHistory] = useState<any[]>([]);\n  const [activeBots, setActiveBots] = useState<any>");
}

// 2. Fetch history in fetchData
// Assuming the array of promises is inside fetchData
if (!code.includes('fetchSafe("/api/history"')) {
  code = code.replace(/fetchSafe\("\/api\/bots", \{dca: \{\}, grid: \{\}\}\)/, 'fetchSafe("/api/bots", {dca: {}, grid: {}}),\n          fetchSafe("/api/history", [])');
  
  // also modify array destructuring
  code = code.replace(/const \[priceRes, accountRes, statsRes, pnlRes, botsRes\] = await Promise.all/, 'const [priceRes, accountRes, statsRes, pnlRes, botsRes, historyRes] = await Promise.all');
  
  // also set history
  code = code.replace(/if \(botsRes\) setActiveBots\(botsRes\);/, 'if (botsRes) setActiveBots(botsRes);\n        if (historyRes) setTradeHistory(historyRes);');
}

// 3. Update downloadCSV or create exportTradesCSV
if (!code.includes('exportTradesCSV')) {
  const exportFunc = `
  const exportTradesCSV = () => {
    const headers = ["ID", "Timestamp", "Date", "Symbol", "Side", "Size", "Price", "Realized PnL"];
    const rows = tradeHistory.map(t => [t.id, t.timestamp, new Date(t.timestamp).toLocaleString(), t.symbol, t.side, t.size, t.price, t.pnl]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\\n"
      + rows.map(e => e.join(",")).join("\\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", \`trade_ledger_\${new Date().toISOString().split('T')[0]}.csv\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Exported Trade Ledger", "success");
  };
`;
  code = code.replace(/const downloadCSV = \(\) => \{/, exportFunc + '\n  const downloadCSV = () => {');
}

// 4. Update the Execution Ledger tab
const targetHistoryTabStart = `onClick={downloadCSV} className="px-6 py-3 bg-white/5 border border-white/10 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all flex items-center gap-2">`;
const replaceHistoryTabStart = `onClick={exportTradesCSV} className="px-6 py-3 bg-white/5 border border-white/10 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all flex items-center gap-2">`;

code = code.replace(targetHistoryTabStart, replaceHistoryTabStart);

const targetTbody = `<tbody className="divide-y divide-white/5">
                        {pnlHistory.slice(0, 10).map((h, i) => (
                           <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                              <td className="px-6 py-4 text-[10px] font-mono text-slate-500">2024-05-16 14:30:{i}</td>
                              <td className="px-6 py-4 text-xs font-black text-white italic">HYPE</td>
                              <td className="px-6 py-4">
                                <span className={\`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm \${i % 2 === 0 ? 'bg-cyan-500/10 text-cyan-500' : 'bg-rose-500/10 text-rose-500'}\`}>
                                   {i % 2 === 0 ? "BUY" : "SELL"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-[10px] font-mono text-slate-400">1,000</td>
                              <td className="px-6 py-4 text-[10px] font-mono text-slate-400">$2.40</td>
                              <td className={\`px-6 py-4 text-[10px] font-mono font-bold \${i % 3 === 0 ? 'text-rose-500' : 'text-cyan-500'}\`}>
                                 {i % 3 === 0 ? "-" : "+"}\${(i * 12.4).toFixed(2)}
                              </td>
                           </tr>
                        ))}
                      </tbody>`;

const replaceTbody = `<tbody className="divide-y divide-white/5">
                        {tradeHistory.length === 0 ? (
                           <tr><td colSpan={6} className="py-8 text-center text-sm font-bold text-slate-500 italic">No trades recorded</td></tr>
                        ) : tradeHistory.map((trade: any, i: number) => (
                           <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                              <td className="px-6 py-4 text-[10px] font-mono text-slate-500">{new Date(trade.timestamp).toLocaleString()}</td>
                              <td className="px-6 py-4 text-xs font-black text-white italic">{trade.symbol}</td>
                              <td className="px-6 py-4">
                                <span className={\`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm \${trade.side === 'buy' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-rose-500/10 text-rose-500'}\`}>
                                   {trade.side.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-[10px] font-mono text-slate-400">{trade.size}</td>
                              <td className="px-6 py-4 text-[10px] font-mono text-white">\${parseFloat(trade.price).toLocaleString()}</td>
                              <td className={\`px-6 py-4 text-[10px] font-mono font-bold \${trade.pnl > 0 ? 'text-cyan-500' : trade.pnl < 0 ? 'text-rose-500' : 'text-slate-500'}\`}>
                                 {trade.pnl > 0 ? '+' : ''}{trade.pnl.toLocaleString()}
                              </td>
                           </tr>
                        ))}
                      </tbody>`;

code = code.replace(targetTbody, replaceTbody);

fs.writeFileSync('src/App.tsx', code);
