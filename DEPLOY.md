# Deployment Guide: Alpha Trading Bot to DigitalOcean

## Step 1: Initial Server Setup
Copy the `setup_droplet.sh` script to your server and run it. This installs Docker, Nginx, and configures the `ufw` firewall.

```bash
chmod +x setup_droplet.sh
./setup_droplet.sh
```

## Step 2: Environment Configuration
Create a `.env` file in your project root on the server:

```env
NODE_ENV=production
DB_PATH=/app/data/trading_bot.db
HYPERLIQUID_WALLET_ADDRESS=0xYourAddress...
HYPERLIQUID_PRIVATE_KEY=your_private_key...
TESTNET=false
LIVE_TRADING=true
```

## Step 3: Deployment
Start the application using Docker Compose. This will build the frontend, compile the backend, and start the server on port 80.

```bash
docker-compose up -d --build
```

## Step 4: Maintenance
- **View Logs**: `docker-compose logs -f app`
- **Stop App**: `docker-compose down`
- **Update**: `git pull && docker-compose up -d --build`

## Security Notes
- Ensure your `data/` directory has proper permissions: `chmod -R 777 data`.
- Never commit your `.env` file with real keys to GitHub.
