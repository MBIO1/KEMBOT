const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// DCA
code = code.replace(/label="Interval"[\s\S]*?placeholder="e\.g\. 1h"/, `label="Interval" \n                             value={dcaConfig.interval} \n                             onChange={(e: any) => setDcaConfig({...dcaConfig, interval: e.target.value})} \n                             placeholder="e.g. 1h"\n                             tooltip="Time duration between executing consecutive trades in the DCA process"`);

code = code.replace(/label="Amount \(\$\)"[\s\S]*?placeholder=\{\`Fallback: \$\$\{globalOrderSize\}\`\}/, `label="Amount ($)" \n                             value={dcaConfig.amount || globalOrderSize} \n                             onChange={(e: any) => setDcaConfig({...dcaConfig, amount: e.target.value})} \n                             placeholder={\`Fallback: \$\${globalOrderSize}\`}\n                             tooltip="Amount in USD to purchase iteratively"`);

code = code.replace(/<SettingsInput \n                             label="Multiplier"[\s\S]*?placeholder="e\.g\. 1\.5"\n                           \/>/, `<SettingsInput \n                             label="Multiplier" \n                             value={dcaConfig.multiplier} \n                             onChange={(e: any) => setDcaConfig({...dcaConfig, multiplier: e.target.value})} \n                             placeholder="e.g. 1.5"\n                             tooltip="A multiplier to increase the size of consecutive orders"\n                           />`);

code = code.replace(/<SettingsInput \n                             label="Take-Profit \(%\)"[\s\S]*?placeholder="e\.g\. 5\.0"\n                           \/>/, `<SettingsInput \n                             label="Take-Profit (%)" \n                             value={dcaConfig.takeProfit} \n                             onChange={(e: any) => setDcaConfig({...dcaConfig, takeProfit: e.target.value})} \n                             placeholder="e.g. 5.0"\n                             tooltip="Target percentage gain per position"\n                           />`);

// Grid
code = code.replace(/label="Levels"[\s\S]*?placeholder="e\.g\. 10"/, `label="Levels" \n                             value={gridConfig.levels} \n                             onChange={(e: any) => setGridConfig({...gridConfig, levels: e.target.value})} \n                             placeholder="e.g. 10"\n                             tooltip="Number of buy and sell orders created across the price action grid"`);

code = code.replace(/label="Spread \(%\)"[\s\S]*?placeholder="e\.g\. 1\.0"/, `label="Spread (%)" \n                             value={gridConfig.spread} \n                             onChange={(e: any) => setGridConfig({...gridConfig, spread: e.target.value})} \n                             placeholder="e.g. 1.0"\n                             tooltip="Distance in percentages between each grid level execution line"`);

code = code.replace(/label="Size \(\$\)"[\s\S]*?placeholder=\{\`Fallback: \$\$\{globalOrderSize\}\`\}/, `label="Size ($)" \n                             value={gridConfig.size || globalOrderSize} \n                             onChange={(e: any) => setGridConfig({...gridConfig, size: e.target.value})} \n                             placeholder={\`Fallback: \$\${globalOrderSize}\`}\n                             tooltip="Dollar size allocated per grid order"`);

code = code.replace(/<SettingsInput \n                             label="Take-Profit \(%\)"[\s\S]*?placeholder="e\.g\. 3\.0"\n                           \/>/, `<SettingsInput \n                             label="Take-Profit (%)" \n                             value={gridConfig.takeProfit} \n                             onChange={(e: any) => setGridConfig({...gridConfig, takeProfit: e.target.value})} \n                             placeholder="e.g. 3.0"\n                             tooltip="Target percentage gain per position"\n                           />`);

// Margin Modes
code = code.replace(/<div className="space-y-2">\n                                 <label className="text-\[9px\] font-bold text-slate-700 uppercase">Mode<\/label>\n                                 <div className="flex bg-white\/5 rounded-xl p-1">\n                                    \{\[\'isolated\', \'cross\'\]\.map\(m => \(\n                                       <button key={m} onClick={\(\) => setDcaConfig\(\{\.\.\.dcaConfig, marginMode: m\}\)} className=\{\`flex-1 py-2 text-\[9px\] font-black uppercase rounded-lg transition-all \$\{dcaConfig\.marginMode === m \? \'bg-cyan-500 text-black\' : \'text-slate-500\'\}\`\}>\{m\}<\/button>\n                                    \)\)\}\n                                 <\/div>\n                              <\/div>\n                              <SettingsInput \n                                 label="Initial Margin \(\$\)" \n                                 value=\{dcaConfig\.initialMargin\} \n                                 onChange=\{\(e: any\) => setDcaConfig\(\{\.\.\.dcaConfig, initialMargin: e\.target\.value\}\)\} \n                              \/>/, 
`                             <div className="space-y-2 group relative">
                                 <label className="text-[9px] font-bold text-slate-700 uppercase flex items-center gap-1">Mode <span className="flex items-center justify-center w-3 h-3 text-[8px] bg-slate-800 text-slate-400 rounded-full cursor-help hover:text-white hover:bg-slate-700 transition-colors">?</span></label>
                                 <div className="flex bg-white/5 rounded-xl p-1">
                                    {['isolated', 'cross'].map(m => (
                                       <button key={m} onClick={() => setDcaConfig({...dcaConfig, marginMode: m})} className={\`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all \${dcaConfig.marginMode === m ? 'bg-cyan-500 text-black' : 'text-slate-500'}\`}>{m}</button>
                                    ))}
                                 </div>
                                 <div className="absolute left-1 bottom-full mb-2 w-max max-w-[200px] z-20 bg-[#08090C] border border-white/10 text-slate-300 text-[10px] p-3 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all hidden group-hover:block shadow-xl whitespace-normal">Isolated margin isolates risk; cross margin uses full account balance.</div>
                              </div>
                              <SettingsInput 
                                 label="Initial Margin ($)" 
                                 value={dcaConfig.initialMargin} 
                                 onChange={(e: any) => setDcaConfig({...dcaConfig, initialMargin: e.target.value})} 
                                 tooltip="Initial margin needed"
                              />`);

// Margin Modes Grid
code = code.replace(/<div className="space-y-2">\n                                 <label className="text-\[9px\] font-bold text-slate-700 uppercase">Mode<\/label>\n                                 <div className="flex bg-white\/5 rounded-xl p-1">\n                                    \{\[\'isolated\', \'cross\'\]\.map\(m => \(\n                                       <button key={m} onClick={\(\) => setGridConfig\(\{\.\.\.gridConfig, marginMode: m\}\)} className=\{\`flex-1 py-2 text-\[9px\] font-black uppercase rounded-lg transition-all \$\{gridConfig\.marginMode === m \? \'bg-indigo-600 text-white\' : \'text-slate-500\'\}\`\}>\{m\}<\/button>\n                                    \)\)\}\n                                 <\/div>\n                              <\/div>\n                              <SettingsInput \n                                 label="Initial Margin \(\$\)" \n                                 value=\{gridConfig\.initialMargin\} \n                                 onChange=\{\(e: any\) => setGridConfig\(\{\.\.\.gridConfig, initialMargin: e\.target\.value\}\)\} \n                              \/>/, 
`                             <div className="space-y-2 group relative">
                                 <label className="text-[9px] font-bold text-slate-700 uppercase flex items-center gap-1">Mode <span className="flex items-center justify-center w-3 h-3 text-[8px] bg-slate-800 text-slate-400 rounded-full cursor-help hover:text-white hover:bg-slate-700 transition-colors">?</span></label>
                                 <div className="flex bg-white/5 rounded-xl p-1">
                                    {['isolated', 'cross'].map(m => (
                                       <button key={m} onClick={() => setGridConfig({...gridConfig, marginMode: m})} className={\`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all \${gridConfig.marginMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}\`}>{m}</button>
                                    ))}
                                 </div>
                                 <div className="absolute left-1 bottom-full mb-2 w-max max-w-[200px] z-20 bg-[#08090C] border border-white/10 text-slate-300 text-[10px] p-3 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all hidden group-hover:block shadow-xl whitespace-normal">Isolated margin isolates risk; cross margin uses full account balance.</div>
                              </div>
                              <SettingsInput 
                                 label="Initial Margin ($)" 
                                 value={gridConfig.initialMargin} 
                                 onChange={(e: any) => setGridConfig({...gridConfig, initialMargin: e.target.value})} 
                                 tooltip="Initial margin needed"
                              />`);

fs.writeFileSync('src/App.tsx', code);
