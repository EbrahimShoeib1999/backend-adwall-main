#!/bin/bash

# Deployment Script for CORS Fix
# Run this on your VPS

echo "================================"
echo "CORS Fix Deployment Script"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if we're in the right directory
echo -e "${YELLOW}Step 1: Checking directory...${NC}"
if [ ! -f "app.js" ]; then
    echo -e "${RED}Error: app.js not found. Please run this script from your backend directory.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Found app.js${NC}"
echo ""

# Step 2: Backup current app.js
echo -e "${YELLOW}Step 2: Backing up current app.js...${NC}"
cp app.js app.js.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

# Step 3: Pull latest code (if using git)
echo -e "${YELLOW}Step 3: Pulling latest code...${NC}"
if [ -d ".git" ]; then
    git pull
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Code updated from Git${NC}"
    else
        echo -e "${RED}✗ Git pull failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Not a git repository. Skipping git pull.${NC}"
    echo -e "${YELLOW}⚠ Please manually upload the updated app.js file.${NC}"
fi
echo ""

# Step 4: Install dependencies (in case anything changed)
echo -e "${YELLOW}Step 4: Checking dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies checked${NC}"
echo ""

# Step 5: Restart the application
echo -e "${YELLOW}Step 5: Restarting application...${NC}"

# Try PM2 first
if command -v pm2 &> /dev/null; then
    echo "Using PM2..."
    pm2 restart all
    echo -e "${GREEN}✓ Application restarted with PM2${NC}"
# Try systemctl
elif systemctl list-units --type=service | grep -q "node"; then
    echo "Using systemctl..."
    SERVICE_NAME=$(systemctl list-units --type=service | grep node | awk '{print $1}' | head -1)
    sudo systemctl restart $SERVICE_NAME
    echo -e "${GREEN}✓ Application restarted with systemctl${NC}"
else
    echo -e "${RED}✗ Could not find PM2 or systemd service${NC}"
    echo -e "${YELLOW}Please restart your Node.js application manually${NC}"
fi
echo ""

# Step 6: Wait for server to start
echo -e "${YELLOW}Step 6: Waiting for server to start...${NC}"
sleep 3
echo -e "${GREEN}✓ Server should be running now${NC}"
echo ""

# Step 7: Test CORS headers
echo -e "${YELLOW}Step 7: Testing CORS headers...${NC}"
RESPONSE=$(curl -s -H "Origin: https://adwallpro.vercel.app" -I http://127.0.0.1:8000/api/v1/categories?page=1&limit=16)

if echo "$RESPONSE" | grep -q "access-control-allow-origin"; then
    echo -e "${GREEN}✓ CORS headers are present!${NC}"
    echo ""
    echo "CORS Headers:"
    echo "$RESPONSE" | grep -i "access-control"
else
    echo -e "${RED}✗ CORS headers are still missing${NC}"
    echo ""
    echo "Response headers:"
    echo "$RESPONSE"
fi
echo ""

# Step 8: Final instructions
echo "================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Test the API from your browser"
echo "2. Check the browser console for CORS errors"
echo "3. If still not working, check the logs:"
echo "   - PM2: pm2 logs"
echo "   - Systemd: sudo journalctl -u your-service-name -f"
echo ""
