const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const replacements = [
  {
    target: /label="Bot Token"(.*?)placeholder="7082348503:AAEn..."/s,
    replacement: 'label="Bot Token"$1placeholder="7082348503:AAEn..." tooltip="Your Telegram Bot Token obtained from BotFather"'
  },
  {
    target: /label="Chat ID"(.*?)placeholder="73294823"/s,
    replacement: 'label="Chat ID"$1placeholder="73294823" tooltip="The numeric ID of the chat/channel to send messages to"'
  },
  {
    target: /label="API Key"/g,
    replacement: 'label="API Key" tooltip="Your Hyperliquid API Key for executing orders"'
  },
  {
    target: /label="Secret Key"/g,
    replacement: 'label="Secret Key" tooltip="The corresponding private secret key"'
  },
  {
    target: /label="Global Max Leverage"/g,
    replacement: 'label="Global Max Leverage" tooltip="Global cap on maximum leverage allowed across all strategies"'
  },
  {
    target: /label="Slippage Buffer"/g,
    replacement: 'label="Slippage Buffer" tooltip="Allowed slippage percentage before order rejection"'
  },
  {
    target: /label="Emergency Kill Switch"/g,
    replacement: 'label="Emergency Kill Switch" tooltip="Immediately halts all running algorithms and closes pending orders"'
  },
  {
    target: /label="Default Order Size \(\$\)"/g,
    replacement: 'label="Default Order Size ($)" tooltip="Fallback size in USD if a strategy encounters an undefined size"'
  },
  {
    target: /label="Base Asset"/g,
    replacement: 'label="Base Asset" tooltip="The primary asset to dollar-cost average into"'
  },
  {
    target: /label="Investment per cycle \(\$\)"/g,
    replacement: 'label="Investment per cycle ($)" tooltip="Amount of USD to spend on each interval purchase"'
  },
  {
    target: /label="Purchase Interval"/g,
    replacement: 'label="Purchase Interval" tooltip="Time between each purchase (e.g., 1h, 1d, 1w)"'
  },
  {
    target: /label="Max Cycles \(0 = infinite\)"/g,
    replacement: 'label="Max Cycles (0 = infinite)" tooltip="Total number of interval purchases before the bot stops"'
  },
  {
    target: /label="Take Profit \(%\)"/g,
    replacement: 'label="Take Profit (%)" tooltip="Percentage of unrealized PnL to reach before selling the entire accumulated position"'
  },
  {
    target: /label="Stop Loss \(%\)"/g,
    replacement: 'label="Stop Loss (%)" tooltip="Percentage of loss to reach before selling the entire accumulated position"'
  },
  {
    target: /label="Trading Pair"/g,
    replacement: 'label="Trading Pair" tooltip="The pair to execute grid trading on"'
  },
  {
    target: /label="Upper Price Bound"/g,
    replacement: 'label="Upper Price Bound" tooltip="The maximum price limit of the grid"'
  },
  {
    target: /label="Lower Price Bound"/g,
    replacement: 'label="Lower Price Bound" tooltip="The minimum price limit of the grid"'
  },
  {
    target: /label="Number of Grids"/g,
    replacement: 'label="Number of Grids" tooltip="Total number of buy and sell levels between upper and lower bounds"'
  },
  {
    target: /label="Capital Allocation \(\$\)"/g,
    replacement: 'label="Capital Allocation ($)" tooltip="Total capital in USD assigned to this grid strategy"'
  }
];

replacements.forEach(({target, replacement}) => {
  code = code.replace(target, replacement);
});

// Update Save & Test Relay button
code = code.replace(
  /<button(.*?)onClick=\{\(\) => \{\n(.*?)addToast\("Config synchronized", "success"\);\n(.*?)sendTelegramMessage\("Relay Authentication Successful. System Secure.", true\);\n(.*?)\}\}\n(.*?)className="(.*?)"/s,
  '<button$1title="Saves credentials and sends a test message" onClick={() => {\n$2addToast("Config synchronized", "success");\n$3sendTelegramMessage("Relay Authentication Successful. System Secure.", true);\n$4}}\n$5className="$6"'
);

fs.writeFileSync('src/App.tsx', code);
