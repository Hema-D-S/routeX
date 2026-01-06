# AWS EC2 Deployment - Step by Step Guide

## Complete Deployment Steps

### STEP 1: Launch EC2 Instance
```
1. Login to AWS Console
2. Go to EC2 Dashboard
3. Click "Launch Instances"
4. AMI: Ubuntu Server 22.04 LTS (free tier eligible)
5. Instance type: t2.micro
6. Storage: 30 GB (default, free tier limit)
7. Create/Select key pair: "uber-clone-key"
8. Security Group:
   - SSH (22): Your IP only
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0
9. Launch instance
10. Allocate Elastic IP (optional but recommended)
```

### STEP 2: SSH into EC2 Instance
```powershell
# From Windows PowerShell
$IP = "your-instance-public-ip"
$KEY = "C:\path\to\uber-clone-key.pem"
ssh -i $KEY ubuntu@$IP
```

### STEP 3: Run Setup Script
```bash
# On EC2 instance:
cd /tmp

# Download and run setup script
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/uber-clone/main/aws-setup.sh
chmod +x aws-setup.sh
./aws-setup.sh
```

**OR manually run these commands:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io git curl wget
sudo usermod -aG docker ubuntu
exit  # Log out
ssh -i $KEY ubuntu@$IP  # Log back in

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install NGINX
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Clone repository
mkdir -p /opt/uber-clone
cd /opt/uber-clone
git clone https://github.com/YOUR_USERNAME/uber-clone.git .

# Create .env.prod
nano .env.prod
# Edit with your values
```

### STEP 4: Configure Environment Variables
```bash
nano /opt/uber-clone/.env.prod
```

**Required values:**
```
DOMAIN_NAME=your-domain.com
NODE_ENV=production
REDIS_PASSWORD=generate-secure-password
JWT_SECRET=generate-secure-secret
FIREBASE_PROJECT_ID=your-firebase-id
FIREBASE_PRIVATE_KEY=your-firebase-key
FIREBASE_CLIENT_EMAIL=your-firebase-email
```

### STEP 5: Configure NGINX
```bash
# Copy NGINX config
sudo cp /opt/uber-clone/nginx.conf /etc/nginx/sites-available/uber-clone
sudo ln -sf /etc/nginx/sites-available/uber-clone /etc/nginx/sites-enabled/uber-clone
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart NGINX
sudo systemctl restart nginx
```

### STEP 6: Point Domain to EC2
```
1. Get Elastic IP from AWS Console
2. Go to your domain registrar
3. Update A record to point to Elastic IP
4. Wait for DNS propagation (5-30 minutes)
5. Verify: nslookup yourdomain.com
```

### STEP 7: Set Up SSL Certificate
```bash
# Get SSL certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts and provide email
# Certificate auto-renewal configured automatically
```

### STEP 8: Deploy Application
```bash
cd /opt/uber-clone

# Make scripts executable
chmod +x deploy.sh health-check.sh backup.sh

# Run deployment
./deploy.sh

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### STEP 9: Setup Automated Deployments (GitHub Actions)

#### A. Generate SSH Key for GitHub
```bash
ssh-keygen -t ed25519 -f /home/ubuntu/.ssh/github-deploy -N ""
cat /home/ubuntu/.ssh/github-deploy
# Copy the private key
```

#### B. Add SSH Key to EC2
```bash
# In ~/.ssh/authorized_keys on EC2:
cat /home/ubuntu/.ssh/github-deploy.pub >> /home/ubuntu/.ssh/authorized_keys
```

#### C. Add GitHub Secrets
```
In GitHub Repository:
Settings → Secrets and variables → Actions

Add these secrets:
1. EC2_HOST = your-elastic-ip-or-domain.com
2. EC2_PRIVATE_KEY = (paste the private key from step A)
3. SLACK_WEBHOOK = (optional, for notifications)
```

### STEP 10: Verify Deployment
```bash
# Check all services
docker-compose -f /opt/uber-clone/docker-compose.prod.yml ps

# Check health endpoints
curl https://yourdomain.com/health
curl https://yourdomain.com/api/health
curl https://yourdomain.com/api/users/health
curl https://yourdomain.com/api/rides/health
curl https://yourdomain.com/api/notifications/health

# View logs
docker-compose -f /opt/uber-clone/docker-compose.prod.yml logs -f

# Check system resources
docker stats
free -h
```

### STEP 11: Setup Automated Backups
```bash
# Backup script runs daily at 2 AM (UTC)
# Already configured in crontab
# View backups:
ls -la /opt/uber-clone/backups/

# Download backup to local machine:
# PowerShell on Windows:
scp -i $KEY -r ubuntu@${IP}:/opt/uber-clone/backups C:\Users\user\Backups\
```

### STEP 12: Enable Auto-Update on Git Push
```bash
# Webhook already configured in .github/workflows/deploy.yml
# When you push to main branch:
1. GitHub Actions runs tests
2. Builds Docker images
3. Pushes to GitHub Container Registry
4. SSH's to EC2
5. Pulls new images
6. Restarts services

# No manual deployment needed!
```

---

## Useful Commands

```bash
# View logs
docker-compose -f /opt/uber-clone/docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f /opt/uber-clone/docker-compose.prod.yml logs -f ride-service

# Restart all services
docker-compose -f /opt/uber-clone/docker-compose.prod.yml restart

# Restart specific service
docker-compose -f /opt/uber-clone/docker-compose.prod.yml restart ride-service

# Scale a service (not recommended on t2.micro)
docker-compose -f /opt/uber-clone/docker-compose.prod.yml up -d --scale ride-service=2

# Stop services
docker-compose -f /opt/uber-clone/docker-compose.prod.yml down

# Remove all data (caution!)
docker-compose -f /opt/uber-clone/docker-compose.prod.yml down -v

# Check health
/opt/uber-clone/health-check.sh

# Manual backup
/opt/uber-clone/backup.sh

# View NGINX logs
sudo tail -f /var/log/nginx/uber_access.log
sudo tail -f /var/log/nginx/uber_error.log

# View SSL certificate status
sudo certbot certificates

# Renew SSL (auto, but can force)
sudo certbot renew --force-renewal
```

---

## Cost Breakdown (AWS Free Tier)

| Service | Free Amount | Cost After |
|---------|-------------|-----------|
| EC2 t2.micro | 750 hours/month | ~$10/month |
| EBS Storage (30 GB) | 30 GB/month | ~$3/month |
| Data transfer OUT | 1 GB/month | $0.09/GB after |
| Data transfer IN | Unlimited | FREE |
| Elastic IP | FREE if attached | $3.50/month if unattached |
| **Total (12 months)** | **$0** | - |
| **Total (after 12 months)** | - | **~$13-15/month** |

---

## Troubleshooting

### Service not starting
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs api-gateway

# Restart specific service
docker-compose -f docker-compose.prod.yml restart api-gateway

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build api-gateway
```

### Out of memory (t2.micro has only 1 GB!)
```bash
# Check memory usage
docker stats

# Limit container memory
docker update --memory=256m api-gateway

# Or restart services
docker-compose -f docker-compose.prod.yml restart
```

### NGINX not forwarding to services
```bash
# Check NGINX config
sudo nginx -t

# Check if services are running
docker-compose -f docker-compose.prod.yml ps

# Test connection from inside container
docker exec api-gateway curl http://localhost:3000/health
```

### SSL certificate issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Check NGINX SSL config
sudo grep -A 5 "ssl_certificate" /etc/nginx/sites-available/uber-clone
```

### Domain not resolving
```bash
# Check DNS
nslookup yourdomain.com

# Check if A record points to correct IP
dig yourdomain.com

# Wait for DNS propagation (5-30 minutes)
```

---

## Security Checklist

- [x] SSH key properly secured
- [x] Security groups restrict SSH to your IP
- [x] SSL certificate installed
- [x] Non-root Docker user
- [x] Health checks configured
- [x] Logs configured
- [x] Backups automated
- [x] Rate limiting on NGINX
- [x] Security headers added
- [ ] Set strong secrets in .env.prod
- [ ] Enable CloudWatch monitoring (optional)
- [ ] Configure CloudTrail (optional)
- [ ] Set billing alerts ($50 limit recommended)

---

## Performance Tips

1. **Monitor memory** - t2.micro has only 1 GB
   - Limit container memory in docker-compose.prod.yml
   - Use Alpine images (lighter)

2. **Optimize images** - Multi-stage builds reduce size
   - Smaller = faster = cheaper transfers

3. **Cache responses** - NGINX caches static files
   - Reduces server load
   - Faster response times

4. **Rate limit** - NGINX rate limits configured
   - Prevents abuse
   - Protects from DDoS

5. **Compress** - GZIP compression enabled
   - Smaller responses
   - Faster downloads

---

## Next Steps After Deployment

1. **Monitor application** - Check logs regularly
2. **Test features** - Ensure everything works
3. **Get user feedback** - Real-world testing
4. **Optimize** - Performance tuning
5. **Scale** (if needed) - Upgrade instance type
6. **Document** - Add deployment notes to README

---

**Deployment Complete! 🎉 Your application is now live!**
