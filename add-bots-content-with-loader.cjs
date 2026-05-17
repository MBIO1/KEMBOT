const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetBotsTab = `{activeTab === "strategies" && (`;
const replaceBotsTab = `{activeTab === "bots" && (
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
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                             <div className="px-3 py-1 bg-cyan-500/10 rounded-full text-[10px] font-black text-cyan-500 uppercase tracking-widest">Active - BTC</div>
                          </div>
                        ) : (
                          <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Idle</div>
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
                          className="flex-1 py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center gap-2">
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
                          className={\`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 \${activeBots?.dca?.['BTC']?.status === 'RUNNING' ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20' : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'}\`}>
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
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                             <div className="px-3 py-1 bg-indigo-500/10 rounded-full text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active - BTC</div>
                          </div>
                        ) : (
                          <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Idle</div>
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
                          className={\`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 \${activeBots?.grid?.['BTC']?.status === 'RUNNING' ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20' : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'}\`}>
                            {pendingBotAction === 'stop_grid_btc' ? <Loader2 className="animate-spin" size={14} /> : null}
                            Stop Grid
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "strategies" && (`;

code = code.replace(targetBotsTab, replaceBotsTab);
fs.writeFileSync('src/App.tsx', code);
