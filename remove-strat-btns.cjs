const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetDcaStstus = `{activeBots?.dca?.['BTC']?.status === 'RUNNING' ? (
                            <div className="px-3 py-1 bg-cyan-500/10 rounded-full text-[10px] font-black text-cyan-500 uppercase tracking-widest">Active</div>
                          ) : (
                            <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Stopped</div>
                          )}`;
const replaceDcaStatus = ``;
code = code.replace(targetDcaStstus, replaceDcaStatus);

const targetDcaBtns = `<div className="flex gap-4">
                         <button 
                           onClick={async () => {
                             try {
                               await fetch('/api/bots/dca', {
                                 method: 'POST',
                                 headers: {'Content-Type': 'application/json'},
                                 body: JSON.stringify(dcaConfig)
                               });
                               addToast("DCA Engine configured and started", "success");
                             } catch(e) {
                               addToast("Failed to start DCA", "error");
                             }
                           }} 
                           className="flex-1 py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-cyan-500 transition-all">
                             Start DCA
                         </button>
                         <button 
                           onClick={async () => {
                             try {
                               await fetch('/api/bots/dca/stop', { method: 'POST' });
                               addToast("DCA Engine stopped", "info");
                             } catch(e) {
                               addToast("Failed to stop DCA", "error");
                             }
                           }} 
                           disabled={!activeBots?.dca?.['BTC'] || activeBots?.dca?.['BTC']?.status !== 'RUNNING'}
                           className={\`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all \${activeBots?.dca?.['BTC']?.status === 'RUNNING' ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20' : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'}\`}>
                             Stop DCA
                         </button>
                       </div>`;
                       
const replaceDcaBtns = `<button 
                          onClick={() => {
                            addToast("DCA template configured. Go to Bots / Instances to start.", "info");
                          }} 
                          className="w-full py-4 bg-white/10 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white/20 transition-all">
                            Save DCA Template
                        </button>`;
code = code.replace(targetDcaBtns, replaceDcaBtns);


const targetGridStatus = `{activeBots?.grid?.['BTC']?.status === 'RUNNING' ? (
                            <div className="px-3 py-1 bg-indigo-500/10 rounded-full text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active</div>
                          ) : (
                            <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Stopped</div>
                          )}`;
const replaceGridStatus = ``;
code = code.replace(targetGridStatus, replaceGridStatus);

const targetGridBtns = `<div className="flex gap-4">
                         <button 
                           onClick={async () => {
                             try {
                               await fetch('/api/bots/grid', {
                                 method: 'POST',
                                 headers: {'Content-Type': 'application/json'},
                                 body: JSON.stringify(gridConfig)
                               });
                               addToast("Grid Master configured and started", "success");
                             } catch(e) {
                               addToast("Failed to start Grid", "error");
                             }
                           }} 
                           className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-indigo-500 transition-all">
                             Start Grid
                         </button>
                         <button 
                           onClick={async () => {
                             try {
                               await fetch('/api/bots/grid/stop', { method: 'POST' });
                               addToast("Grid Master stopped", "info");
                             } catch(e) {
                               addToast("Failed to stop Grid", "error");
                             }
                           }} 
                           disabled={!activeBots?.grid?.['BTC'] || activeBots?.grid?.['BTC']?.status !== 'RUNNING'}
                           className={\`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all \${activeBots?.grid?.['BTC']?.status === 'RUNNING' ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20' : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'}\`}>
                             Stop Grid
                         </button>
                       </div>`;

const replaceGridBtns = `<button 
                          onClick={() => {
                            addToast("Grid template configured. Go to Bots / Instances to start.", "info");
                          }} 
                          className="w-full py-4 bg-indigo-500/20 text-indigo-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-indigo-500/40 transition-all">
                            Save Grid Template
                        </button>`;
code = code.replace(targetGridBtns, replaceGridBtns);

fs.writeFileSync('src/App.tsx', code);
