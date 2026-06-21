#!/bin/bash
# NutriTrack Server Setup Script
# Run once on a fresh Hostinger VPS: bash setup.sh
set -e

APP_DIR="/var/www/nutritrack"
REPO="https://github.com/denrajan1505/NutriTrack.git"

echo "===== [1/8] Installing system packages ====="
apt-get update -y
apt-get install -y software-properties-common nginx git curl build-essential python3-pip

# Install Python 3.12 via deadsnakes PPA (safe on any Ubuntu version)
if ! command -v python3.12 &> /dev/null; then
    add-apt-repository ppa:deadsnakes/ppa -y
    apt-get update -y
    apt-get install -y python3.12 python3.12-venv python3.12-dev
fi
echo "Python: $(python3.12 --version)"

echo "===== [2/8] Installing Node.js 20 ====="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node: $(node -v) | npm: $(npm -v)"

echo "===== [3/8] Cloning repository ====="
mkdir -p $APP_DIR
if [ -d "$APP_DIR/.git" ]; then
    echo "Repo already exists, pulling latest..."
    git -C $APP_DIR pull
else
    git clone $REPO $APP_DIR
fi

echo "===== [4/8] Setting up Python backend ====="
cd $APP_DIR/backend
python3.12 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

echo ""
echo "===== [5/8] Create backend .env file ====="
if [ ! -f "$APP_DIR/backend/.env" ]; then
    cat > $APP_DIR/backend/.env << 'ENVFILE'
# Supabase
SUPABASE_URL=https://mwcxmogqfvgcmipavzko.supabase.co
SUPABASE_KEY=PASTE_YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=PASTE_YOUR_SUPABASE_SERVICE_KEY

# AI
GEMINI_API_KEY=PASTE_YOUR_GEMINI_API_KEY
OPENAI_API_KEY=PASTE_YOUR_OPENAI_API_KEY

# WhatsApp (Twilio) - optional
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# App
SECRET_KEY=nutritrack-super-secret-key-2024
CORS_ORIGINS=["http://187.77.122.203"]
ADMIN_EMAILS=["denraj1505@gmail.com"]
ENVFILE
    echo ""
    echo "!!! ACTION REQUIRED: Edit /var/www/nutritrack/backend/.env with your real API keys"
    echo "    Run: nano /var/www/nutritrack/backend/.env"
    echo "    Then re-run: bash /var/www/nutritrack/deploy/setup.sh"
    exit 0
else
    echo ".env already exists, skipping..."
fi

echo "===== [6/8] Building React frontend ====="
cd $APP_DIR/frontend
cat > .env.production << 'FRONTENV'
VITE_SUPABASE_URL=https://mwcxmogqfvgcmipavzko.supabase.co
VITE_SUPABASE_ANON_KEY=PASTE_YOUR_SUPABASE_ANON_KEY
VITE_API_URL=http://nutries.appden.sbs
FRONTENV

echo "Update frontend/.env.production with your Supabase anon key if needed"
npm install
npm run build
echo "Frontend built at $APP_DIR/frontend/dist"

echo "===== [7/8] Configuring Nginx ====="
cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/nutritrack
ln -sf /etc/nginx/sites-available/nutritrack /etc/nginx/sites-enabled/nutritrack
# Disable default site if present
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "===== [8/8] Starting backend service ====="
cp $APP_DIR/deploy/nutritrack.service /etc/systemd/system/nutritrack.service
systemctl daemon-reload
systemctl enable nutritrack
systemctl restart nutritrack
sleep 2
systemctl status nutritrack --no-pager

echo ""
echo "====================================================="
echo "  NutriTrack deployed at http://187.77.122.203"
echo "====================================================="
