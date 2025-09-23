#!/bin/bash

echo "=== Checking for Additional Server Limits ==="
echo ""

echo "1. Checking for reverse proxy configurations..."
echo "Looking for upstream configurations:"
nginx -T 2>/dev/null | grep -A 10 -B 5 upstream || echo "No upstream config found"

echo ""
echo "2. Checking for load balancer configurations..."
echo "Looking for proxy_pass configurations:"
nginx -T 2>/dev/null | grep -A 5 -B 5 proxy_pass || echo "No proxy_pass found"

echo ""
echo "3. Checking for CloudFlare or CDN configurations..."
echo "Looking for CloudFlare headers:"
nginx -T 2>/dev/null | grep -i cloudflare || echo "No CloudFlare config found"

echo ""
echo "4. Checking nginx error logs for 413 errors..."
echo "Recent 413 errors in nginx logs:"
grep -i "413\|request entity too large" /var/log/nginx/error.log 2>/dev/null | tail -10 || echo "No 413 errors found in nginx logs"

echo ""
echo "5. Checking for PHP-FPM limits (if applicable)..."
if command -v php-fpm &> /dev/null; then
    echo "PHP-FPM configuration:"
    php-fpm -t 2>/dev/null || echo "PHP-FPM not running"
    
    echo "PHP upload limits:"
    php -i 2>/dev/null | grep -E "(upload_max_filesize|post_max_size)" || echo "PHP not configured"
else
    echo "PHP-FPM not found"
fi

echo ""
echo "6. Checking for Apache limits (if applicable)..."
if command -v apache2 &> /dev/null; then
    echo "Apache configuration:"
    apache2ctl -S 2>/dev/null | grep -i limit || echo "No Apache limits found"
else
    echo "Apache not found"
fi

echo ""
echo "7. Checking system limits..."
echo "Current ulimit settings:"
ulimit -a

echo ""
echo "8. Checking for HAProxy (if applicable)..."
if command -v haproxy &> /dev/null; then
    echo "HAProxy configuration:"
    haproxy -c -f /etc/haproxy/haproxy.cfg 2>/dev/null | grep -i limit || echo "No HAProxy limits found"
else
    echo "HAProxy not found"
fi

echo ""
echo "9. Checking for Docker or container limits..."
if command -v docker &> /dev/null; then
    echo "Docker containers running:"
    docker ps 2>/dev/null || echo "Docker not accessible"
else
    echo "Docker not found"
fi

echo ""
echo "10. Checking for hosting provider specific configurations..."
echo "Looking for Hostinger specific configs:"
find /etc -name "*hostinger*" -o -name "*hpanel*" 2>/dev/null || echo "No Hostinger specific configs found"

echo ""
echo "=== Summary ==="
echo "If you're still getting 413 errors after nginx is configured correctly:"
echo "1. Check if you're behind a reverse proxy or load balancer"
echo "2. Check if you're using CloudFlare or another CDN"
echo "3. Check hosting provider limits in control panel"
echo "4. Check for PHP-FPM limits if using PHP"
echo "5. Contact hosting support for additional limits"
