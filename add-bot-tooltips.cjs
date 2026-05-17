const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /className="flex-1 py-4 bg-white text-black font-black uppercase text-\[10px\] tracking-widest rounded-2xl transition-all shadow-\[0_0_20px_rgba\(34,211,238,0\)\] hover:shadow-\[0_0_20px_rgba\(34,211,238,0\.4\)\] flex items-center justify-center gap-2">\s*\{pendingBotAction === 'start_dca_btc' \? <Loader2 className="animate-spin" size=\{14\} \/> : null\}\s*Start DCA/s,
  'title="Start the DCA Engine with the current configuration" className="flex-1 py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center gap-2">\n                            {pendingBotAction === \'start_dca_btc\' ? <Loader2 className="animate-spin" size={14} /> : null}\n                            Start DCA'
);

code = code.replace(
  /className=\{(.*?)\}>\s*\{pendingBotAction === 'stop_dca_btc' \? <Loader2 className="animate-spin" size=\{14\} \/> : null\}\s*Stop DCA/s,
  'title="Halt the running DCA Engine" className={$1}>\n                            {pendingBotAction === \'stop_dca_btc\' ? <Loader2 className="animate-spin" size={14} /> : null}\n                            Stop DCA'
);

code = code.replace(
  /className="flex-1 py-4 bg-white text-black font-black uppercase text-\[10px\] tracking-widest rounded-2xl transition-all shadow-\[0_0_20px_rgba\(99,102,241,0\)\] hover:shadow-\[0_0_20px_rgba\(99,102,241,0\.4\)\] flex items-center justify-center gap-2">\s*\{pendingBotAction === 'start_grid_btc' \? <Loader2 className="animate-spin" size=\{14\} \/> : null\}\s*Start Grid/s,
  'title="Start the Grid Master with the current configuration" className="flex-1 py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(99,102,241,0)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2">\n                            {pendingBotAction === \'start_grid_btc\' ? <Loader2 className="animate-spin" size={14} /> : null}\n                            Start Grid'
);

code = code.replace(
  /className=\{(.*?)\}>\s*\{pendingBotAction === 'stop_grid_btc' \? <Loader2 className="animate-spin" size=\{14\} \/> : null\}\s*Stop Grid/s,
  'title="Halt the running Grid Master" className={$1}>\n                            {pendingBotAction === \'stop_grid_btc\' ? <Loader2 className="animate-spin" size={14} /> : null}\n                            Stop Grid'
);

fs.writeFileSync('src/App.tsx', code);
