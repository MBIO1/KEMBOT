import React, { useEffect, useState, useRef } from 'react';

interface OrderBookProps {
  coin?: string;
}

export function OrderBook({ coin = 'BTC' }: OrderBookProps) {
  const [bids, setBids] = useState<[number, number][]>([]);
  const [asks, setAsks] = useState<[number, number][]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let active = true;
    const ws = new WebSocket('wss://api.hyperliquid.xyz/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: { type: "l2Book", coin }
      }));
    };

    ws.onmessage = (event) => {
      if (!active) return;
      try {
        const data = JSON.parse(event.data);
        if (data.channel === "l2Book" && data.data && data.data.levels) {
          const parseLevel = (levelArr: any) => {
             return levelArr.map((v: any) => [parseFloat(v.px), parseFloat(v.sz)]);
          };
          
          if (data.data.levels[0]) {
             setBids(parseLevel(data.data.levels[0]).slice(0, 15));
          }
          if (data.data.levels[1]) {
             setAsks(parseLevel(data.data.levels[1]).slice(0, 15));
          }
        }
      } catch (e) {
        console.error("Order book parse error", e);
      }
    };

    ws.onerror = (e) => console.error("WS Orderbook error", e);

    return () => {
      active = false;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          method: "unsubscribe",
          subscription: { type: "l2Book", coin }
        }));
      }
      ws.close();
    };
  }, [coin]);

  const maxVolume = Math.max(
    ...bids.map(b => b[1]),
    ...asks.map(a => a[1]),
    0.001
  );

  return (
    <div className="flex flex-col h-full bg-[#0A0C10] rounded-3xl border border-white/5 p-6 overflow-hidden">
      <h3 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em] mb-4 flex justify-between items-center">
         Order Book <span className="text-[10px] text-cyan-500">{coin}/USD</span>
      </h3>
      <div className="flex text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2 px-2">
        <div className="flex-1 text-left">Price</div>
        <div className="flex-1 text-right">Size</div>
      </div>
      
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="flex-1 overflow-hidden flex flex-col-reverse relative">
          {asks.slice().reverse().map((ask, i) => (
             <div key={`ask-${i}`} className="flex text-[10px] py-1 px-2 relative group hover:bg-white/[0.02]">
                <div 
                   className="absolute top-0 right-0 h-full bg-rose-500/10 pointer-events-none transition-all" 
                   style={{ width: `${(ask[1] / maxVolume) * 100}%` }}
                />
                <div className="flex-1 text-rose-400 font-mono text-left z-10">{ask[0].toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}</div>
                <div className="flex-1 text-slate-300 font-mono text-right z-10">{ask[1].toLocaleString(undefined, {maximumFractionDigits: 4})}</div>
             </div>
          ))}
        </div>

        <div className="py-2 flex items-center justify-center border-y border-white/5 bg-white/[0.01]">
            <span className="text-xs font-black italic text-white tracking-widest">
               {asks.length > 0 && bids.length > 0 ? ((asks[0][0] + bids[0][0]) / 2).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1}) : '---'}
            </span>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col relative">
          {bids.map((bid, i) => (
             <div key={`bid-${i}`} className="flex text-[10px] py-1 px-2 relative group hover:bg-white/[0.02]">
                <div 
                   className="absolute top-0 right-0 h-full bg-emerald-500/10 pointer-events-none transition-all" 
                   style={{ width: `${(bid[1] / maxVolume) * 100}%` }}
                />
                <div className="flex-1 text-emerald-400 font-mono text-left z-10">{bid[0].toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}</div>
                <div className="flex-1 text-slate-300 font-mono text-right z-10">{bid[1].toLocaleString(undefined, {maximumFractionDigits: 4})}</div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}