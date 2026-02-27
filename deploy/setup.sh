#!/bin/bash
# Purify deployment setup — run as root
set -e

echo "=== Purify Deployment Setup ==="

# 1. Enable Apache proxy modules
echo "Enabling Apache proxy modules..."
sed -i 's/^#LoadModule proxy_module/LoadModule proxy_module/' /etc/httpd/conf/httpd.conf
sed -i 's/^#LoadModule proxy_http_module/LoadModule proxy_http_module/' /etc/httpd/conf/httpd.conf
sed -i 's/^#LoadModule proxy_wstunnel_module/LoadModule proxy_wstunnel_module/' /etc/httpd/conf/httpd.conf

# 2. Install Apache config
echo "Installing Apache proxy config..."
cp /srv/http/purify/deploy/purify-apache.conf /etc/httpd/conf/conf.d/purify.conf

# 3. Test Apache config
echo "Testing Apache config..."
apachectl configtest

# 4. Install systemd service
echo "Installing systemd service..."
cp /srv/http/purify/purify.service /etc/systemd/system/purify.service
systemctl daemon-reload

# 5. Enable and start
echo "Starting purify service..."
systemctl enable --now purify

# 6. Reload Apache
echo "Reloading Apache..."
systemctl reload httpd

echo "=== Done! Purify is running ==="
echo "Access at http://localhost/purify/"
