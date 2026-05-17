const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Insert import if needed
if (!code.includes('OrderBook')) {
  code = code.replace(/import React(.*?);/, "import React$1;\nimport { OrderBook } from './components/OrderBook';");
}

const marketWatchOld = /<div className="col-span-12 lg:col-span-4 bg-\[#0A0C10\] rounded-3xl border border-white\/5 p-8 flex flex-col justify-between h-full">[\s\S]*?<\/div>\n                    <\/div>\n                  <\/div>\n                <\/div>\n              \)}/;

const marketWatchNew = `<div className="col-span-12 lg:col-span-4 h-full min-h-[500px]">
                       <OrderBook coin="BTC" />
                    </div>
                  </div>
                </div>
              )}`;

code = code.replace(marketWatchOld, marketWatchNew);

fs.writeFileSync('src/App.tsx', code);
