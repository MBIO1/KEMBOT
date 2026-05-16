const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(/type TabType = "dashboard" \| "strategies" \| "history" \| "alerts" \| "settings" \| "activity" \| "backtest";/, `type TabType = "dashboard" | "strategies" | "history" | "alerts" | "settings" | "activity" | "backtest" | "bots";`);

const linkTarget = `<SidebarLink icon={<History size={18} />} label="Ledger" active={activeTab === "history"} onClick={() => { setActiveTab("history"); setIsSidebarOpen(false); }} />`;

const linkReplace = `<SidebarLink icon={<History size={18} />} label="Ledger" active={activeTab === "history"} onClick={() => { setActiveTab("history"); setIsSidebarOpen(false); }} />
            <SidebarLink icon={<Zap size={18} />} label="Bots / Instances" active={activeTab === "bots"} onClick={() => { setActiveTab("bots"); setIsSidebarOpen(false); }} />`;

code = code.replace(linkTarget, linkReplace);

fs.writeFileSync('src/App.tsx', code);
