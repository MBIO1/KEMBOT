# HyperQuant MVP - Hyperliquid Trading Bot

Professional-grade automated trading system for Hyperliquid, implemented in high-performance TypeScript.

## 🚀 Overview

HyperQuant is a robust trading bot designed for the Hyperliquid L1. It supports multiple strategies, real-time risk management, and a comprehensive web dashboard for monitoring and control.

### Core Features
- **Hyperliquid Connector**: Low-latency interaction with HL Info and Exchange APIs.
- **Strategies**: 
  - **Grid Bot**: Market-making style strategy placing a grid of limit orders.
  - **DCA Bot**: Dollar-cost-averaging into positions at defined intervals.
- **Risk Engine**: Multi-tier validation including leverage, position size, and exposure limits.
- **Web Dashboard**: Real-time monitoring of PnL, positions, trade history, and bot control.
- **Database**: SQLite backed persistence for bots, orders, and fills.

## 🛠 Tech Stack
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, Vite, Tailwind CSS, Recharts, Motion
- **Database**: SQLite (better-sqlite3)
- **API**: Hyperliquid JSON-RPC / REST

## 🚦 Getting Started

### 1. Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```env
HYPERLIQUID_PRIVATE_KEY="your_private_key"
HYPERLIQUID_WALLET_ADDRESS="your_public_address"
TESTNET=true
DRY_RUN=true
LIVE_TRADING=false
```

### 2. Installation
```bash
npm install
```

### 3. Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## 🧪 Testing Strategies
Tests are located in the `tests/` directory (mapped from user request):
- `tests/test_risk.ts`: Validates risk engine logic.
- `tests/test_strategies.ts`: Simulation tests for Grid/DCA logic.

## ⚠️ Safety Warning
- **DRY_RUN=true** is enabled by default. Orders will only be logged, not placed.
- **TESTNET=true** is highly recommended for initial testing.
- **LIVE_TRADING=false** prevents any real financial risk. 
- Use at your own risk. Automated trading involves significant risk of capital loss.

## 📜 Porting Note
This implementation was shifted to TypeScript (from the requested Python) to leverage the full-stack real-time capabilities of the AI Studio environment, providing a much richer interactive dashboard experience while maintaining quant-grade performance.
