const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Update state definition
code = code.replace(
  /useState<\{name: string, type: string, config: any\}\[\]>\(\(\) => \{/,
  "useState<{name: string, dcaConfig: any, gridConfig: any}[]>(() => {"
);

// Update savePreset signature and logic
const savePresetOld = `  const savePreset = (type: string, config: any) => {
    if (!presetName) {
      addToast("Please enter a preset name", "error");
      return;
    }
    setStrategyPresets(prev => [...prev, { name: presetName, type, config }]);
    setPresetName("");
    addToast(\`Preset '\${presetName}' cached successfully\`, "success");
  };`;

const savePresetNew = `  const savePreset = () => {
    if (!presetName) {
      addToast("Please enter a preset name", "error");
      return;
    }
    setStrategyPresets(prev => [...prev, { name: presetName, dcaConfig: {...dcaConfig}, gridConfig: {...gridConfig} }]);
    setPresetName("");
    addToast(\`Preset '\${presetName}' cached successfully\`, "success");
  };
  
  const deletePreset = (idx: number) => {
    setStrategyPresets(prev => prev.filter((_, i) => i !== idx));
    addToast("Preset deleted", "info");
  };`;

code = code.replace(savePresetOld, savePresetNew);

// Update loadPreset logic
const loadPresetOld = `  const loadPreset = (preset: any) => {
    if (preset.type === 'dca') setDcaConfig(preset.config);
    if (preset.type === 'grid') setGridConfig(preset.config);
    addToast(\`Loaded preset: \${preset.name}\`, "info");
  };`;

const loadPresetNew = `  const loadPreset = (preset: any) => {
    setDcaConfig(preset.dcaConfig);
    setGridConfig(preset.gridConfig);
    addToast(\`Loaded config from: \${preset.name}\`, "info");
  };`;
code = code.replace(loadPresetOld, loadPresetNew);

// Update UI
const oldPresetsUI = `                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest">Strategic Presets</h3>
                        <div className="flex gap-2">
                           <input 
                            type="text" 
                            placeholder="Preset Name" 
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-black uppercase text-white placeholder-slate-700"
                           />
                           <button onClick={() => savePreset('dca', dcaConfig)} className="px-3 py-1 bg-cyan-500/10 text-cyan-500 rounded-lg text-[9px] font-black uppercase border border-cyan-500/20">Save DCA</button>
                           <button onClick={() => savePreset('grid', gridConfig)} className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg text-[9px] font-black uppercase border border-indigo-500/20">Save Grid</button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                         {strategyPresets.length === 0 ? (
                           <p className="text-[10px] text-slate-600 font-bold uppercase italic p-2 border border-dashed border-white/5 rounded-xl w-full text-center">No cached presets detected</p>
                         ) : (
                           strategyPresets.map((p, i) => (
                             <button key={i} onClick={() => loadPreset(p)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-cyan-500 transition-all flex items-center gap-2">
                                <Lock size={10} className={p.type === 'dca' ? 'text-cyan-500' : 'text-indigo-500'} />
                                {p.name}
                             </button>
                           ))
                         )}
                      </div>`;

const newPresetsUI = `                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest">Global Presets</h3>
                        <div className="flex gap-2">
                           <input 
                            type="text" 
                            placeholder="Preset Name" 
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-black uppercase text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
                            title="Enter a name to save current DCA and Grid configurations"
                           />
                           <button onClick={savePreset} title="Save current DCA and Grid configurations as a global preset" className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg text-[9px] font-black uppercase border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">Save Config</button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                         {strategyPresets.length === 0 ? (
                           <p className="text-[10px] text-slate-600 font-bold uppercase italic p-2 border border-dashed border-white/5 rounded-xl w-full text-center">No cached presets detected</p>
                         ) : (
                           strategyPresets.map((p, i) => (
                             <div key={i} className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden group hover:border-indigo-500/50 transition-all">
                                <button onClick={() => loadPreset(p)} title="Load this preset" className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-2">
                                  <Lock size={10} className="text-indigo-500" />
                                  {p.name}
                                </button>
                                <button onClick={() => deletePreset(i)} title="Delete preset" className="px-3 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border-l border-white/5">
                                  <X size={10} />
                                </button>
                             </div>
                           ))
                         )}
                      </div>`;

code = code.replace(oldPresetsUI, newPresetsUI);

if (!code.includes('X,')) {
    code = code.replace(/import \{ /, "import { X, ");
}

fs.writeFileSync('src/App.tsx', code);
