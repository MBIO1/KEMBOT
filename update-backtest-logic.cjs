const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const runBacktestOld = /const runBacktest = \(\) => \{[\s\S]*?addToast\("Backtest sequence completed\.", "success"\);\n    \}, 2000\);\n  \};/;

const runBacktestNew = `const runBacktest = () => {
    setIsBacktesting(true);
    // Simulate backtest for multiple strategies to compare
    setTimeout(() => {
      const strategiesToCompare = ["Grid Arbitrage", "DCA Optimizer", "Trend Following"];
      
      const chartDataLength = 30;
      let chartData = Array.from({ length: chartDataLength }, (_, i) => ({ name: \`Day \${i + 1}\` }));
      
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
  };`;

code = code.replace(runBacktestOld, runBacktestNew);


// Update UI
const oldUI = /<div className="lg:col-span-3 space-y-6">[\s\S]*?<ResponsiveContainer width="100%" height="80%">[\s\S]*?<\/ResponsiveContainer>\s*<\/div>\s*<\/motion\.div>\s*\)\s*:\s*\([\s\S]*?<\/div>\s*\)\}\s*<\/div>/;

const newUI = `<div className="lg:col-span-3 space-y-6">
                       {backtestResults ? (
                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                               {backtestResults.summary.map((res: any, idx: number) => (
                                 <div key={idx} className="bg-[#0A0C10] rounded-2xl border border-white/5 p-6 group">
                                     <h4 className="text-xs font-black uppercase text-white tracking-widest mb-4 flex items-center justify-between">
                                        {res.strategy}
                                        <div className={\`w-2 h-2 rounded-full \${idx === 0 ? 'bg-indigo-500' : idx === 1 ? 'bg-cyan-500' : 'bg-emerald-500'}\`} />
                                     </h4>
                                     <div className="grid grid-cols-2 gap-4">
                                        <div>
                                           <div className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Net Profit</div>
                                           <div className={\`text-lg font-black \${parseFloat(res.totalProfit) >= 0 ? 'text-emerald-500' : 'text-rose-500'}\`}>{parseFloat(res.totalProfit) >= 0 ? '+' : ''}\${res.totalProfit}</div>
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
                                            <div className={\`w-2 h-2 rounded-full \${idx === 0 ? 'bg-indigo-500' : idx === 1 ? 'bg-cyan-500' : 'bg-emerald-500'}\`} />
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
                    </div>`;

code = code.replace(oldUI, newUI);

fs.writeFileSync('src/App.tsx', code);
