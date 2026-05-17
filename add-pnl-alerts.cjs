const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add a ref to track the last alerted PnL percent change
const refInsertCode = `  const [telegramConfig, setTelegramConfig] = useState(() => {`;
const refInsertReplacement = `  const lastAlertedPnLRef = useRef<number | null>(null);\n` + refInsertCode;

code = code.replace(refInsertCode, refInsertReplacement);

// Hook into the fetchData logic
const statsCheckCode = /if \(statsRes\) setStats\(statsRes\);/;
const statsCheckReplacement = `if (statsRes) {
          setStats(statsRes);
          if (telegramConfig.enabled && telegramConfig.pnlThreshold && statsRes.unrealizedTotal !== undefined) {
             const currentUnrealized = parseFloat(statsRes.unrealizedTotal);
             if (accountRes && accountRes.balance > 0) {
               const pnlPercent = (currentUnrealized / accountRes.balance) * 100;
               const threshold = parseFloat(telegramConfig.pnlThreshold);
               
               if (!isNaN(threshold)) {
                  if (lastAlertedPnLRef.current === null) {
                      lastAlertedPnLRef.current = pnlPercent;
                  } else if (Math.abs(pnlPercent - lastAlertedPnLRef.current) >= threshold) {
                      lastAlertedPnLRef.current = pnlPercent;
                      sendTelegramMessage(\`🚨 PnL Alert: Unrealized PnL shifted by > \${threshold}%! Current: \${pnlPercent > 0 ? '+' : ''}\${pnlPercent.toFixed(2)}% (\$\${currentUnrealized.toFixed(2)})\`, false);
                  }
               }
             }
          }
        }`;

code = code.replace(statsCheckCode, statsCheckReplacement);
fs.writeFileSync('src/App.tsx', code);
