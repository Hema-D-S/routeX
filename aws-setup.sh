#!/bin/bash

# Setup and Deploy Uber Clone on AWS EC2 (t2.micro)
# This script automates the entire deployment process

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Uber Clone AWS EC2 Setup Script${NC}"
echo -e "${BLUE}================================================${NC}"

# Step 1: Update system
echo -e "\n${YELLOW}Step 1: Updating system packages...${NC}"
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git nano

# Step 2: Install Docker
echo -e "\n${YELLOW}Step 2: Installing Docker...${NC}"
sudo apt install -y docker.io
sudo usermod -aG docker ubuntu
echo -e "${GREEN}✅ Docker installed${NC}"

# Step 3: Install Docker Compose
echo -e "\n${YELLOW}Step 3: Installing Docker Compose...${NC}"
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
echo -e "${GREEN}✅ Docker Compose installed${NC}"

# Step 4: Install NGINX
echo -e "\n${YELLOW}Step 4: Installing NGINX...${NC}"
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
echo -e "${GREEN}✅ NGINX installed and enabled${NC}"

# Step 5: Install SSL tools
echo -e "\n${YELLOW}Step 5: Installing SSL certificate tools...${NC}"
sudo apt install -y certbot python3-certbot-nginx
echo -e "${GREEN}✅ Certbot installed${NC}"

# Step 6: Clone repository
echo -e "\n${YELLOW}Step 6: Cloning repository...${NC}"
if [ ! -d "/opt/uber-clone" ]; then
    sudo mkdir -p /opt/uber-clone
    sudo chown ubuntu:ubuntu /opt/uber-clone
fi

cd /opt/uber-clone
git clone https://github.com/YOUR_USERNAME/uber-clone.git . 2>/dev/null || git pull origin main
echo -e "${GREEN}✅ Repository cloned${NC}"

# Step 7: Create .env.prod
echo -e "\n${YELLOW}Step 7: Creating environment configuration...${NC}"
if [ ! -f .env.prod ]; then
    cat > .env.prod <<EOF
DOMAIN_NAME=yourdomain.com
NODE_ENV=production
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
EOF
    echo -e "${YELLOW}⚠️  Created .env.prod - Please edit with your values:${NC}"
    echo "    nano /opt/uber-clone/.env.prod"
else
    echo -e "${GREEN}✅ .env.prod already exists${NC}"
fi

# Step 8: Configure NGINX
echo -e "\n${YELLOW}Step 8: Configuring NGINX...${NC}"
sudo cp /opt/uber-clone/nginx.conf /etc/nginx/sites-available/uber-clone
sudo ln -sf /etc/nginx/sites-available/uber-clone /etc/nginx/sites-enabled/uber-clone
sudo rm -f /etc/nginx/sites-enabled/default

# Test NGINX config
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo -e "${GREEN}✅ NGINX configured${NC}"
else
    echo -e "${RED}❌ NGINX configuration error${NC}"
    exit 1
fi

# Step 9: Setup SSL (if domain is reachable)
echo -e "\n${YELLOW}Step 9: Setting up SSL certificate...${NC}"
echo -e "${YELLOW}Make sure your domain points to this server's IP before proceeding!${NC}"
read -p "Is your domain (yourdomain.com) pointing to this server's IP? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    DOMAIN=$(grep 'DOMAIN_NAME=' /opt/uber-clone/.env.prod | cut -d'=' -f2)
    sudo certbot certonly --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN 2>/dev/null || echo -e "${YELLOW}⚠️  SSL setup requires manual domain verification${NC}"
    echo -e "${GREEN}✅ SSL certificate obtained${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping SSL setup. Configure your domain DNS records and run: sudo certbot certonly --nginx -d yourdomain.com${NC}"
fi

# Step 10: Make scripts executable
echo -e "\n${YELLOW}Step 10: Setting up deployment scripts...${NC}"
chmod +x /opt/uber-clone/deploy.sh
chmod +x /opt/uber-clone/health-check.sh
chmod +x /opt/uber-clone/backup.sh
echo -e "${GREEN}✅ Scripts configured${NC}"

# Step 11: Deploy application
echo -e "\n${YELLOW}Step 11: Deploying application...${NC}"
cd /opt/uber-clone
/opt/uber-clone/deploy.sh
echo -e "${GREEN}✅ Application deployed${NC}"

# Step 12: Setup cron jobs
echo -e "\n${YELLOW}Step 12: Setting up automated tasks...${NC}"
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/uber-clone/health-check.sh >> /var/log/uber-health.log 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/uber-clone/backup.sh >> /var/log/uber-backup.log 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "0 3 * * 0 certbot renew --quiet") | crontab -
echo -e "${GREEN}✅ Cron jobs configured${NC}"

# Step 13: Setup GitHub Actions secrets
echo -e "\n${YELLOW}Step 13: GitHub Actions setup...${NC}"
echo -e "${YELLOW}To enable automatic deployments, add these secrets to your GitHub repository:${NC}"
echo -e "${BLUE}Settings → Secrets and variables → Actions${NC}"
echo ""
echo "Required secrets:"
echo "  - EC2_HOST: $(ec2-metadata --public-ipv4 2>/dev/null | cut -d' ' -f2 || echo 'your-instance-public-ip')"
echo "  - EC2_PRIVATE_KEY: (contents of your .pem file)"
echo "  - SLACK_WEBHOOK: (optional, for deployment notifications)"

# Summary
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Edit environment variables:"
echo "   nano /opt/uber-clone/.env.prod"
echo ""
echo "2. If you skipped SSL, obtain certificate:"
echo "   sudo certbot certonly --nginx -d yourdomain.com"
echo ""
echo "3. Add GitHub secrets for auto-deployment"
echo ""
echo "4. Check application status:"
echo "   docker-compose -f /opt/uber-clone/docker-compose.prod.yml ps"
echo ""
echo "5. View logs:"
echo "   docker-compose -f /opt/uber-clone/docker-compose.prod.yml logs -f"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "   Deploy: /opt/uber-clone/deploy.sh"
echo "   Health: /opt/uber-clone/health-check.sh"
echo "   Backup: /opt/uber-clone/backup.sh"
echo "   Logs:   docker-compose -f /opt/uber-clone/docker-compose.prod.yml logs -f"
echo "   Status: docker-compose -f /opt/uber-clone/docker-compose.prod.yml ps"
echo ""
echo -e "${BLUE}Your Application URL:${NC}"
echo "   https://yourdomain.com"
echo ""
