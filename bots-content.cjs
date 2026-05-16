const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetBotsTab = `{activeTab === "strategies" && (`;
const replaceBotsTab = `{activeTab === "bots" && (
                <div className="space-y-8">
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
                          <div className="px-3 py-1 bg-cyan-500/10 rounded-full text-[10px] font-black text-cyan-500 uppercase tracking-widest">Active - BTC</div>
                        ) : (
                          <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Idle</div>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Base Asset</span>
                          <span className="text-xs font-black text-white italic">BTC/USD</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Positions</span>
                          <span className="text-xs font-black text-cyan-500">0</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total PnL</span>
                          <span className="text-xs font-black text-slate-300">$0.00</span>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
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
                          className="flex-1 py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-cyan-500 transition-all shadow-[0_0_20px_rgba(34,211,238,0)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]">
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
                          <div className="px-3 py-1 bg-indigo-500/10 rounded-full text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active - BTC</div>
                        ) : (
                          <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Idle</div>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Base Asset</span>
                          <span className="text-xs font-black text-white italic">BTC/USD</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Grids</span>
                          <span className="text-xs font-black text-indigo-400">0</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total PnL</span>
                          <span className="text-xs font-black text-slate-300">$0.00</span>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
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
                          className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]">
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
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "strategies" && (`;

code = code.replace(targetBotsTab, replaceBotsTab);

fs.writeFileSync('src/App.tsx', code);
