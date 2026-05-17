const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('AlertCircle')) {
  code = code.replace(/import \{ /, "import { AlertCircle, PlayCircle, StopCircle, CheckCircle2, ");
}

const botBadgeTargetDCA = `{activeBots?.dca?.['BTC']?.status === 'RUNNING' ? (
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                             <div className="px-3 py-1 bg-cyan-500/10 rounded-full text-[10px] font-black text-cyan-500 uppercase tracking-widest">Active - BTC</div>
                          </div>
                        ) : (
                          <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Idle</div>
                        )}`;

const botBadgeReplacementDCA = `
                        {activeBots?.dca?.['BTC']?.status === 'RUNNING' ? (
                          <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                             <PlayCircle size={14} className="text-cyan-400 animate-pulse" />
                             <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Running — BTC</span>
                          </div>
                        ) : activeBots?.dca?.['BTC']?.status === 'ERROR' ? (
                          <div className="flex items-center gap-2 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                             <AlertCircle size={14} className="text-rose-400" />
                             <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Error — BTC</span>
                          </div>
                        ) : activeBots?.dca?.['BTC']?.status === 'STOPPED' ? (
                          <div className="flex items-center gap-2 bg-slate-500/10 px-3 py-1.5 rounded-full border border-slate-500/20">
                             <StopCircle size={14} className="text-slate-400" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stopped — BTC</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-white/5">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Idle</span>
                          </div>
                        )}`;

const botBadgeTargetGrid = `{activeBots?.grid?.['BTC']?.status === 'RUNNING' ? (
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                             <div className="px-3 py-1 bg-indigo-500/10 rounded-full text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active - BTC</div>
                          </div>
                        ) : (
                          <div className="px-3 py-1 bg-slate-500/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Idle</div>
                        )}`;

const botBadgeReplacementGrid = `
                        {activeBots?.grid?.['BTC']?.status === 'RUNNING' ? (
                          <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                             <PlayCircle size={14} className="text-indigo-400 animate-pulse" />
                             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Running — BTC</span>
                          </div>
                        ) : activeBots?.grid?.['BTC']?.status === 'ERROR' ? (
                          <div className="flex items-center gap-2 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                             <AlertCircle size={14} className="text-rose-400" />
                             <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Error — BTC</span>
                          </div>
                        ) : activeBots?.grid?.['BTC']?.status === 'STOPPED' ? (
                          <div className="flex items-center gap-2 bg-slate-500/10 px-3 py-1.5 rounded-full border border-slate-500/20">
                             <StopCircle size={14} className="text-slate-400" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stopped — BTC</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-white/5">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Idle</span>
                          </div>
                        )}`;

code = code.replace(botBadgeTargetDCA, botBadgeReplacementDCA);
code = code.replace(botBadgeTargetGrid, botBadgeReplacementGrid);

fs.writeFileSync('src/App.tsx', code);
