#!/bin/bash
# Droplet Setup Script for Alpha Trading Bot

echo "Updating system..."
sudo apt update && sudo apt upgrade -y

echo "Installing dependencies..."
sudo apt install -y git docker.io docker-compose nginx ufw

echo "Configuring Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "Ensuring Docker is running..."
sudo systemctl start docker
sudo systemctl enable docker

echo "Creating application directory..."
mkdir -p ~/trading-bot/data
chmod 777 ~/trading-bot/data

echo "Setup complete! You can now copy your files to ~/trading-bot and run: docker-compose up -d"
