const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetReturn = `return (
    <div className="flex h-screen bg-[#030406] overflow-hidden font-sans text-slate-300">`;

const replaceReturn = `return (
    <div className="flex h-screen bg-[#030406] overflow-hidden font-sans text-slate-300">
      <AnimatePresence>
        {isInitialLoad && (
          <motion.div 
            initial={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#030406] backdrop-blur-xl"
          >
             <div className="flex flex-col items-center gap-6">
                <div className="relative">
                   <div className="w-16 h-16 border-t-2 border-r-2 border-cyan-500 rounded-full animate-spin" />
                   <div className="absolute inset-0 w-16 h-16 border-b-2 border-l-2 border-indigo-500 rounded-full animate-spin direction-reverse" />
                   <Activity className="absolute inset-0 m-auto text-white opacity-50" size={20} />
                </div>
                <div className="text-center">
                   <h2 className="text-sm font-black uppercase text-white tracking-[0.3em]">AlphaQuant</h2>
                   <p className="text-[10px] items-center gap-2 flex font-bold tracking-widest text-slate-500 uppercase mt-2">
                     <Loader2 className="animate-spin" size={10} /> Initializing Engine
                   </p>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>`;

code = code.replace(targetReturn, replaceReturn);

fs.writeFileSync('src/App.tsx', code);
