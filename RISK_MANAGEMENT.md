# 🛡️ KEMBOT Risk Management System - Complete Guide

## Overview

The KEMBOT trading bot now includes a comprehensive risk management system to protect your capital during live trading on Hyperliquid mainnet. This guide explains each component and how to configure it safely.

---

## 🚀 Quick Start - Production Setup

### Step 1: Get Your Hyperliquid Credentials

1. **Private Key**: Export from your wallet
   ```
   Never share this - keep it offline!
   ```

2. **Wallet Address**: Your trading account public address
   ```
   0x...
   ```

3. **(Recommended) Create a Vault/Subaccount**:
   - Master account signs orders for the vault
   - Vault cannot move funds without master signature
   - See: https://hyperliquid.gitbook.io/hyperliquid-docs/

### Step 2: Configure `.env`

Copy `.env.production` to `.env`:

```bash
cp .env.production .env
```

Update with your credentials:

```env
# Network
TESTNET=false
DRY_RUN=false
LIVE_TRADING=true

# Credentials
HYPERLIQUID_PRIVATE_KEY=<your-key>
HYPERLIQUID_WALLET_ADDRESS=<your-address>

# Risk Limits (start conservative!)
MAX_POSITION_SIZE_USD=1000          # $1k per position
MAX_TOTAL_EXPOSURE_USD=5000         # $5k total
MAX_LEVERAGE_ALLOWED=2              # 2x max
DAILY_LOSS_LIMIT_USD=250            # Stop after $250 loss
```

### Step 3: Test with Testnet First

```bash
TESTNET=true DRY_RUN=true npm run dev
```

- Run for 24+ hours
- Verify orders show in logs
- Check bot behavior
- No real money at risk

### Step 4: Go Live (Mainnet with Small Position)

```bash
npm run dev  # Uses production .env
```

- Start with $10-50 per trade
- Monitor closely for first 48 hours
- Check account equity regularly
- Scale position size gradually

---

## 📊 Risk Management Components

### 1. Position Size Limits

**Config**: `MAX_POSITION_SIZE_USD`

- **Default**: $2,000 USD per position
- **Use Case**: Prevents single trade blowing up account
- **Rule**: `order_size_usd ≤ MAX_POSITION_SIZE_USD`

**Example**:
```
MAX_POSITION_SIZE_USD = $2,000
BTC @ $65,000 per coin
Max size = $2,000 / $65,000 = 0.0308 BTC
```

---

### 2. Total Exposure Limits

**Config**: `MAX_TOTAL_EXPOSURE_USD`

- **Default**: $10,000 USD total
- **Use Case**: Prevents overleveraging across multiple positions
- **Rule**: `sum(all_positions_usd) ≤ MAX_TOTAL_EXPOSURE_USD`

**Example**:
```
MAX_TOTAL_EXPOSURE_USD = $10,000
Current positions:
  - BTC: $3,000 (0.046 BTC @ $65k)
  - ETH: $2,000 (0.58 ETH @ $3,450)
  - SOL: $2,000 (13.8 SOL @ $145)
Total exposure = $7,000 ✅

Trying to add $4,000 SOL order:
$7,000 + $4,000 = $11,000 > $10,000 ❌ BLOCKED
```

---

### 3. Leverage Limits

**Config**: `MAX_LEVERAGE_ALLOWED`

- **Default**: 2x (very safe)
- **Hyperliquid Max**: 5x
- **Rule**: `total_exposure / available_balance ≤ MAX_LEVERAGE_ALLOWED`

**Example**:
```
Available balance: $5,000
MAX_LEVERAGE_ALLOWED: 2x
Max allowed exposure: $5,000 × 2 = $10,000

Safe margin: $10,000 - $7,000 = $3,000
Next order limit: $3,000 max
```

---

### 4. Daily Loss Limits

**Config**: `DAILY_LOSS_LIMIT_USD`

- **Default**: $500 USD per day
- **Use Case**: Prevents catastrophic drawdowns
- **Rule**: `realized_pnl ≤ -DAILY_LOSS_LIMIT_USD` → STOP TRADING

**Behavior**:
```
Trading log (same day):
09:00 - Trade 1: -$50 PnL (total: -$50)
10:15 - Trade 2: -$120 PnL (total: -$170)
14:30 - Trade 3: -$190 PnL (total: -$360)
16:45 - Trade 4: Wants to execute (-$360 + new trade)
        If new trade -$200 = -$560 total
        EXCEEDS LIMIT → ORDER BLOCKED
```

---

### 5. Minimum Balance Alerts

**Config**: `MIN_BALANCE_ALERT_USD`

- **Default**: $100 USD
- **Use Case**: Warning system (doesn't block, just warns)
- **When Triggered**: Logs warning to console and UI

```
Available balance: $95 USD
Alert level: $100 USD
⚠️ WARNING: Low balance - $95 USD < $100 USD minimum
```

---

### 6. Slippage Protection

**Config**: `MAX_SLIPPAGE_PERCENT`

- **Default**: 0.5%
- **Use Case**: Prevents bad fills due to market movement
- **Rule**: `|order_price - current_price| / current_price ≤ MAX_SLIPPAGE_PERCENT`

**Example**:
```
Current market price: $61,500
Order attempted at: $61,200

Slippage = ($61,500 - $61,200) / $61,500 = 0.49% ✅
Blocked if slippage > 0.5%
```

---

### 7. Order Rate Limiting

**Config**: `ORDER_RATE_LIMIT_MS`

- **Default**: 1,000 ms (1 second minimum between orders)
- **Use Case**: Prevents API rate limit violations
- **Rule**: `time_since_last_order ≥ ORDER_RATE_LIMIT_MS`

```
Order 1: 10:00:00.000
Order 2: Attempted 10:00:00.200
Wait time = 200ms < 1000ms ❌ BLOCKED
Wait until: 10:00:01.000
```

---

## 🔒 Production Safety Checklist

Before going live with real money:

- [ ] Private key is NOT in version control
- [ ] `.env` file is in `.gitignore`
- [ ] Use vault/subaccount if possible
- [ ] Start with 50% of planned position size
- [ ] Run testnet for 24+ hours without issues
- [ ] Monitor first live trade manually
- [ ] Check account equity every hour first day
- [ ] Have emergency close button readily available
- [ ] Set up Telegram alerts for large P&L changes
- [ ] Rotate credentials every 90 days

---

## 🚨 Emergency Procedures

### Emergency Close All Positions

```bash
# Via API
curl -X POST http://localhost:3000/api/emergency/close-all \
  -H "x-api-key: $API_AUTH_TOKEN"
```

### Disable Trading

```env
# Immediately set in .env
LIVE_TRADING=false
DRY_RUN=true
```

### Revoke API Key

1. Rotate `HYPERLIQUID_PRIVATE_KEY`
2. Revoke vault address on Hyperliquid
3. Create new account

---

## 📈 Recommended Risk Profiles

### Conservative (Safest - Recommended for Beginners)
```env
MAX_POSITION_SIZE_USD=500
MAX_TOTAL_EXPOSURE_USD=2000
MAX_LEVERAGE_ALLOWED=1.5
DAILY_LOSS_LIMIT_USD=100
MAX_SLIPPAGE_PERCENT=0.3
```

### Moderate (Balanced)
```env
MAX_POSITION_SIZE_USD=2000
MAX_TOTAL_EXPOSURE_USD=10000
MAX_LEVERAGE_ALLOWED=2
DAILY_LOSS_LIMIT_USD=500
MAX_SLIPPAGE_PERCENT=0.5
```

### Aggressive (Higher Risk - Experienced Only)
```env
MAX_POSITION_SIZE_USD=5000
MAX_TOTAL_EXPOSURE_USD=25000
MAX_LEVERAGE_ALLOWED=3
DAILY_LOSS_LIMIT_USD=1000
MAX_SLIPPAGE_PERCENT=1.0
```

---

## 🐛 Troubleshooting

### "Order blocked: Insufficient balance"
- Account balance too low
- Increase `DAILY_LOSS_LIMIT_USD` recovery time
- Deposit more USDC

### "Order blocked: Position limit exceeded"
- Hit `MAX_POSITION_SIZE_USD`
- Close existing positions
- Reduce `DCA_ORDER_SIZE_USD` or `GRID_ORDER_SIZE_USD`

### "Order blocked: Excessive slippage"
- Market volatility too high
- Increase `MAX_SLIPPAGE_PERCENT` (risky!)
- Wait for calmer market conditions

### "Rate limit: wait Xms before next order"
- Orders too frequent
- Increase `ORDER_RATE_LIMIT_MS`
- Check for bot bugs (shouldn't happen)

---

## 📊 Monitoring

Check bot health every day:

```bash
# Check open positions
curl http://localhost:3000/api/account/summary \
  -H "x-api-key: $API_AUTH_TOKEN"

# Check running bots
curl http://localhost:3000/api/bots/status \
  -H "x-api-key: $API_AUTH_TOKEN"

# Download trade history
curl http://localhost:3000/api/trading/history \
  -H "x-api-key: $API_AUTH_TOKEN" > trades.json
```

---

## ⚖️ Legal & Tax

- **Trading Tax**: Track all trades for tax reporting
- **Exchange Compliance**: Hyperliquid is not regulated in some jurisdictions
- **Wallet Responsibility**: You are responsible for account security
- **No Guarantees**: Bot is provided AS-IS

---

**Questions?** Check the main README.md or open an issue.

**Ready?** 🚀 Follow the production setup above, then go live!
