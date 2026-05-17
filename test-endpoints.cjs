const http = require('http');

['/api/market/prices', '/api/account/summary', '/api/stats', '/api/pnl', '/api/bots'].forEach(path => {
  http.get('http://localhost:3000' + path, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log(path, res.statusCode, data));
  }).on('error', (e) => console.log(path, 'Error', e.message));
});
