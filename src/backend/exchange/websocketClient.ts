import WebSocket from 'ws';
import { EventEmitter } from 'events';

export class WebsocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url = 'wss://api.hyperliquid.xyz/ws';
  private pingInterval: any = null;
  private isConnected = false;
  
  constructor() {
    super();
  }

  connect() {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      this.isConnected = true;
      console.log('[Hyperliquid WS] Connected');
      
      // Subscribe to individual coins as requested: BTC, ETH, SOL, SUI
      const pairs = ['BTC', 'ETH', 'SOL', 'SUI'];
      pairs.forEach(coin => {
        this.ws?.send(JSON.stringify({
          method: 'subscribe',
          subscription: { type: 'trades', coin }
        }));
      });

      // Also subscribe to allMids just in case we need general prices
      this.ws?.send(JSON.stringify({
        method: 'subscribe',
        subscription: { type: 'webData2', user: '0x0000000000000000000000000000000000000000' }
      }));

      // Keepalive
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ method: 'ping' }));
        }
      }, 50000);
    });

    this.ws.on('message', (data: WebSocket.RawData) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.channel === 'trades') {
          const trades = message.data;
          if (Array.isArray(trades)) {
            for (const trade of trades) {
              const price = parseFloat(trade.px);
              this.emit('priceUpdate', { symbol: trade.coin, price });
            }
          }
        } else if (message.channel === 'webData2') {
          if (message.data && message.data.meta && message.data.meta.universe) {
            // we have allMids
          }
        }
      } catch (err) {
        console.error('[Hyperliquid WS] Error parsing message:', err);
      }
    });

    this.ws.on('close', () => {
      this.isConnected = false;
      console.log('[Hyperliquid WS] Disconnected');
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
      }
      setTimeout(() => this.connect(), 3000);
    });

    this.ws.on('error', (err) => {
      console.error('[Hyperliquid WS] Error:', err);
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
