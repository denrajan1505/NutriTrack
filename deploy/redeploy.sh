#!/bin/bash
# NutriTrack Redeploy Script — run after pushing new code to GitHub
set -e

APP_DIR="/var/www/nutritrack"

echo "===== Pulling latest code ====="
git -C $APP_DIR pull

echo "===== Updating Python dependencies ====="
cd $APP_DIR/backend
./venv/bin/pip install -r requirements.txt

echo "===== Rebuilding frontend ====="
cd $APP_DIR/frontend
npm install
npm run build

echo "===== Restarting backend ====="
systemctl restart nutritrack
sleep 2
systemctl status nutritrack --no-pager

echo "===== Done — http://187.77.122.203 ====="
