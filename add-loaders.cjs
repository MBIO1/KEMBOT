const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('Loader2')) {
  code = code.replace(/import \{ /, `import { Loader2, `);
}

// Add state for button loaders
if (!code.includes('pendingBotAction')) {
  code = code.replace(/const \[activeBots, setActiveBots\] = useState<any>\(\{ dca: \{\}, grid: \{\} \}\);/, `const [activeBots, setActiveBots] = useState<any>({ dca: {}, grid: {} });\n  const [pendingBotAction, setPendingBotAction] = useState<string | null>(null);`);
}

// Add loading state for data fetch
if (!code.includes('isInitialLoad')) {
  code = code.replace(/const \[activeBots, setActiveBots\] = useState<any>/, `const [isInitialLoad, setIsInitialLoad] = useState(true);\n  const [activeBots, setActiveBots] = useState<any>`);
  
  code = code.replace(/const fetchData = async \(\) => \{/, `const fetchData = async () => {`);
  code = code.replace(/if \(accountRes\) \{/, `setIsInitialLoad(false);\n        if (accountRes) {`);
}

fs.writeFileSync('src/App.tsx', code);
