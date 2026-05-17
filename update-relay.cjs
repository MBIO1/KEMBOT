const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add pnlThreshold to initial state
code = code.replace(
  /chatId: ""/,
  'chatId: "",\n      pnlThreshold: "5.0"'
);

// Add the setting to UI
const relayControlsOld = /<SettingsInput \n                            label="Chat ID"(.*?)placeholder="73294823" tooltip="The numeric ID of the chat\/channel to send messages to"\n                        \/>/;

const relayControlsNew = `<SettingsInput \n                            label="Chat ID"$1placeholder="73294823" tooltip="The numeric ID of the chat/channel to send messages to"\n                        />
                        <SettingsInput 
                            label="PnL Alert Threshold (%)" 
                            type="number" 
                            value={telegramConfig.pnlThreshold || ''} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTelegramConfig(prev => ({...prev, pnlThreshold: e.target.value}))} 
                            placeholder="5.0"
                            tooltip="Trigger a Telegram alert when PnL changes by this percentage"
                        />`;

code = code.replace(relayControlsOld, relayControlsNew);

fs.writeFileSync('src/App.tsx', code);
