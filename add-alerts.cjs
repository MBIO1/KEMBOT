const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetInitial = `      maxDrawdown: "5.0",\n      liqProximity: "10.0"`;
const replaceInitial = `      maxDrawdown: "5.0",\n      liqProximity: "10.0",\n      priceTarget: "",\n      pnlChange: ""`;
code = code.replace(targetInitial, replaceInitial);

const targetInputs = `                          <SettingsInput \n                            label="Liquidation Proximity Alert (%)" \n                            value={alertThresholds.liqProximity} \n                            onChange={(e: any) => setAlertThresholds({...alertThresholds, liqProximity: e.target.value})} \n                            placeholder="e.g. 10.0"\n                          />\n                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight -mt-4 italic">Triggers a high-priority Telegram relay when price within range of liq.</p>`;

const replaceInputs = `                          <SettingsInput \n                            label="Liquidation Proximity Alert (%)" \n                            value={alertThresholds.liqProximity} \n                            onChange={(e: any) => setAlertThresholds({...alertThresholds, liqProximity: e.target.value})} \n                            placeholder="e.g. 10.0"\n                          />\n                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight -mt-4 italic">Triggers a high-priority Telegram relay when price within range of liq.</p>
                          <SettingsInput 
                            label="Price Target Alert ($)" 
                            value={alertThresholds.priceTarget} 
                            onChange={(e: any) => setAlertThresholds({...alertThresholds, priceTarget: e.target.value})} 
                            placeholder="e.g. 65000"
                          />
                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight -mt-4 italic">Sends a Telegram notification when asset hits this price.</p>
                          <SettingsInput 
                            label="PnL Change Alert (%)" 
                            value={alertThresholds.pnlChange} 
                            onChange={(e: any) => setAlertThresholds({...alertThresholds, pnlChange: e.target.value})} 
                            placeholder="e.g. 5.0"
                          />
                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight -mt-4 italic">Sends a Telegram notification when PnL moves significantly.</p>`;

code = code.replace(targetInputs, replaceInputs);

fs.writeFileSync('src/App.tsx', code);
