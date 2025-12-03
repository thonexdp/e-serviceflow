#!/bin/bash

# Soketi Deployment Diagnostic Script
# Run this on your Soketi VM to check configuration

echo "========================================="
echo "   SOKETI DEPLOYMENT DIAGNOSTIC"
echo "========================================="
echo ""

# Check if running as expected user
echo "1. Current User:"
whoami
echo ""

# Check if Node.js is installed
echo "2. Node.js Version:"
node --version 2>&1 || echo "❌ Node.js not installed"
echo ""

# Check if PM2 is installed
echo "3. PM2 Version:"
pm2 --version 2>&1 || echo "❌ PM2 not installed"
echo ""

# Check if Soketi directory exists
echo "4. Soketi Directory:"
if [ -d "/opt/soketi" ]; then
    echo "✅ /opt/soketi exists"
    ls -la /opt/soketi
else
    echo "❌ /opt/soketi does not exist"
fi
echo ""

# Check if Soketi config exists
echo "5. Soketi Configuration:"
if [ -f "/opt/soketi/config.json" ]; then
    echo "✅ config.json exists"
    echo "Content (with sensitive data):"
    cat /opt/soketi/config.json
else
    echo "❌ config.json not found"
fi
echo ""

# Check if Soketi is installed
echo "6. Soketi Package:"
if [ -f "/opt/soketi/node_modules/@soketi/soketi/bin/server.js" ]; then
    echo "✅ Soketi is installed"
else
    echo "❌ Soketi package not found"
fi
echo ""

# Check PM2 processes
echo "7. PM2 Processes:"
pm2 list 2>&1 || echo "❌ Cannot list PM2 processes"
echo ""

# Check if Soketi is running
echo "8. Soketi Process Status:"
pm2 show soketi 2>&1 || echo "❌ Soketi process not found in PM2"
echo ""

# Check if port 6001 is listening
echo "9. Port 6001 Status:"
if command -v netstat &> /dev/null; then
    netstat -tuln | grep ":6001" || echo "❌ Nothing listening on port 6001"
elif command -v ss &> /dev/null; then
    ss -tuln | grep ":6001" || echo "❌ Nothing listening on port 6001"
else
    echo "⚠️  Cannot check port status (netstat/ss not available)"
fi
echo ""

# Test local connection to Soketi
echo "10. Local Connection Test:"
response=$(curl -s -w "\n%{http_code}" http://localhost:6001/ 2>&1)
http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    echo "✅ Soketi responding locally: $body"
else
    echo "❌ Soketi not responding on localhost:6001"
    echo "   HTTP Code: $http_code"
    echo "   Response: $body"
fi
echo ""

# Get external IP
echo "11. VM External IP:"
external_ip=$(curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip 2>&1)
if [ $? -eq 0 ]; then
    echo "✅ External IP: $external_ip"
    echo ""
    
    # Test external connection
    echo "12. External Connection Test:"
    echo "   Testing: http://$external_ip:6001/"
    ext_response=$(curl -s -w "\n%{http_code}" --connect-timeout 5 http://$external_ip:6001/ 2>&1)
    ext_http_code=$(echo "$ext_response" | tail -n 1)
    ext_body=$(echo "$ext_response" | head -n -1)
    
    if [ "$ext_http_code" = "200" ]; then
        echo "   ✅ Soketi accessible externally"
    else
        echo "   ❌ Cannot reach Soketi from external IP"
        echo "   This usually means firewall rules are not configured correctly"
    fi
else
    echo "⚠️  Cannot get external IP (not a GCP VM or metadata service not available)"
fi
echo ""

# Check firewall (iptables)
echo "13. Firewall Rules (iptables):"
if command -v iptables &> /dev/null && sudo -n iptables -L -n &> /dev/null; then
    iptables_rules=$(sudo iptables -L -n | grep 6001)
    if [ -n "$iptables_rules" ]; then
        echo "$iptables_rules"
    else
        echo "✅ No local iptables rules blocking port 6001"
    fi
else
    echo "⚠️  Cannot check iptables (requires sudo)"
fi
echo ""

# Check recent logs
echo "14. Recent Soketi Logs (last 20 lines):"
pm2 logs soketi --lines 20 --nostream 2>&1 || echo "❌ Cannot read logs"
echo ""

# Summary and recommendations
echo "========================================="
echo "   DIAGNOSTIC SUMMARY"
echo "========================================="
echo ""

# Determine overall status
all_good=true

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    all_good=false
fi

if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed"
    all_good=false
fi

if [ ! -d "/opt/soketi" ]; then
    echo "❌ Soketi directory missing"
    all_good=false
fi

if [ ! -f "/opt/soketi/config.json" ]; then
    echo "❌ Soketi configuration missing"
    all_good=false
fi

pm2 show soketi &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Soketi not running in PM2"
    all_good=false
fi

if [ "$http_code" != "200" ]; then
    echo "❌ Soketi not responding locally"
    all_good=false
fi

if [ "$all_good" = true ]; then
    echo "✅ Soketi appears to be configured and running correctly!"
    echo ""
    echo "Next steps:"
    echo "1. Ensure GCP firewall rule allows port 6001"
    echo "2. Update Cloud Run environment variables with:"
    echo "   PUSHER_HOST=$external_ip"
    echo "   PUSHER_PORT=6001"
    echo "   PUSHER_SCHEME=http"
    echo "3. Ensure PUSHER_APP_KEY and PUSHER_APP_SECRET match config.json"
else
    echo ""
    echo "⚠️  Issues detected. Please review the diagnostic output above."
    echo ""
    echo "Common fixes:"
    echo "- Install missing dependencies (Node.js, PM2, Soketi)"
    echo "- Create /opt/soketi directory and copy config files"
    echo "- Start Soketi with: pm2 start ecosystem.config.js"
    echo "- Check GCP firewall rules allow TCP port 6001"
fi

echo ""
echo "========================================="
echo "For help, see: SOKETI_DEPLOYMENT_GUIDE.md"
echo "========================================="
