const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetDca = `<div className="space-y-2">
                                <label className="text-[9px] font-bold text-slate-700 uppercase">Mode</label>
                                <div className="flex bg-white/5 rounded-xl p-1">
                                   {['isolated', 'cross'].map(m => (
                                      <button key={m} onClick={() => setDcaConfig({...dcaConfig, marginMode: m})} className={\`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all \${dcaConfig.marginMode === m ? 'bg-cyan-500 text-black' : 'text-slate-500'}\`}>{m}</button>
                                   ))}
                                </div>
                             </div>
                             <SettingsInput 
                                label="Initial Margin ($)" 
                                value={dcaConfig.initialMargin} 
                                onChange={(e: any) => setDcaConfig({...dcaConfig, initialMargin: e.target.value})} 
                             />`;

const replaceDca = `<div className="space-y-2 group relative">
                                <label className="text-[9px] font-bold text-slate-700 uppercase flex items-center gap-1 w-max">Mode <span className="flex items-center justify-center w-3 h-3 text-[8px] bg-slate-800 text-slate-400 rounded-full cursor-help hover:text-white hover:bg-slate-700 transition-colors">?</span></label>
                                <div className="flex bg-white/5 rounded-xl p-1">
                                   {['isolated', 'cross'].map(m => (
                                      <button key={m} onClick={() => setDcaConfig({...dcaConfig, marginMode: m})} className={\`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all \${dcaConfig.marginMode === m ? 'bg-cyan-500 text-black' : 'text-slate-500'}\`}>{m}</button>
                                   ))}
                                </div>
                                <div className="absolute left-1 bottom-full mb-2 w-max max-w-[200px] z-20 bg-[#08090C] border border-white/10 text-slate-300 text-[10px] p-3 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all hidden group-hover:block shadow-xl whitespace-normal">Isolated margin isolates risk to this bot; cross uses full account balance.</div>
                             </div>
                             <SettingsInput 
                                label="Initial Margin ($)" 
                                value={dcaConfig.initialMargin} 
                                onChange={(e: any) => setDcaConfig({...dcaConfig, initialMargin: e.target.value})} 
                                tooltip="Initial margin needed"
                             />`;
code = code.replace(targetDca, replaceDca);

const targetGrid = `<div className="space-y-2">
                                <label className="text-[9px] font-bold text-slate-700 uppercase">Mode</label>
                                <div className="flex bg-white/5 rounded-xl p-1">
                                   {['isolated', 'cross'].map(m => (
                                      <button key={m} onClick={() => setGridConfig({...gridConfig, marginMode: m})} className={\`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all \${gridConfig.marginMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}\`}>{m}</button>
                                   ))}
                                </div>
                             </div>
                             <SettingsInput 
                                label="Initial Margin ($)" 
                                value={gridConfig.initialMargin} 
                                onChange={(e: any) => setGridConfig({...gridConfig, initialMargin: e.target.value})} 
                             />`;
const replaceGrid = `<div className="space-y-2 group relative">
                                <label className="text-[9px] font-bold text-slate-700 uppercase flex items-center gap-1 w-max">Mode <span className="flex items-center justify-center w-3 h-3 text-[8px] bg-slate-800 text-slate-400 rounded-full cursor-help hover:text-white hover:bg-slate-700 transition-colors">?</span></label>
                                <div className="flex bg-white/5 rounded-xl p-1">
                                   {['isolated', 'cross'].map(m => (
                                      <button key={m} onClick={() => setGridConfig({...gridConfig, marginMode: m})} className={\`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all \${gridConfig.marginMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}\`}>{m}</button>
                                   ))}
                                </div>
                                <div className="absolute left-1 bottom-full mb-2 w-max max-w-[200px] z-20 bg-[#08090C] border border-white/10 text-slate-300 text-[10px] p-3 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all hidden group-hover:block shadow-xl whitespace-normal">Isolated margin isolates risk to this grid bot; cross uses full account balance.</div>
                             </div>
                             <SettingsInput 
                                label="Initial Margin ($)" 
                                value={gridConfig.initialMargin} 
                                onChange={(e: any) => setGridConfig({...gridConfig, initialMargin: e.target.value})} 
                                tooltip="Initial margin needed specifically allocated to running the total required grid architecture"
                             />`;
code = code.replace(targetGrid, replaceGrid);

fs.writeFileSync('src/App.tsx', code);
