# AWS Deployment - Quick Checklist

## ✅ Pre-Deployment Checklist

### Local Development
- [ ] All services running locally: `docker-compose up -d`
- [ ] Health checks passing: `curl http://localhost:3000/health`
- [ ] Frontend accessible: `http://localhost:5173`
- [ ] Database migrations complete
- [ ] Environment variables configured
- [ ] Tests passing (if applicable)

### GitHub Repository
- [ ] Code pushed to main branch: `git push origin main`
- [ ] All Dockerfiles present (5 files)
- [ ] docker-compose.prod.yml exists
- [ ] .env.example provided
- [ ] .github/workflows/deploy.yml configured

---

## 🚀 AWS EC2 Deployment Steps

### STEP 1: Create AWS Account
```
□ Create free tier account at aws.amazon.com
□ Verify email
□ Add payment method
□ Select free tier services
```

### STEP 2: Launch EC2 Instance
```
□ Go to EC2 Dashboard
□ Click "Launch Instances"
□ Select "Ubuntu Server 22.04 LTS" (free eligible)
□ Instance type: t2.micro (free)
□ Storage: 30 GB (default)
□ Create key pair: uber-clone-key
□ Security Group settings:
  □ SSH (22) - YOUR IP ONLY
  □ HTTP (80) - 0.0.0.0/0
  □ HTTPS (443) - 0.0.0.0/0
□ Review and Launch
□ Download .pem file to: C:\Users\user\.ssh\
□ Copy Public IPv4 address
```

### STEP 3: SSH into Instance
```powershell
# Windows PowerShell
$IP = "your-instance-ip"
$KEY = "C:\Users\user\.ssh\uber-clone-key.pem"
ssh -i $KEY ubuntu@$IP
```

### STEP 4: Run Setup Script
```bash
# On EC2 instance
cd /tmp
curl -O https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/uber-clone/main/aws-setup.sh
chmod +x aws-setup.sh
./aws-setup.sh

# Follow prompts and wait for setup to complete
```

### STEP 5: Configure Environment
```bash
# Edit environment variables
nano /opt/uber-clone/.env.prod

# Required values:
# DOMAIN_NAME=yourdomain.com
# REDIS_PASSWORD=generate-secure-password
# JWT_SECRET=generate-secure-secret
# FIREBASE_PROJECT_ID=your-firebase-id
# FIREBASE_PRIVATE_KEY=your-firebase-key

# Save: Ctrl+X, Y, Enter
```

### STEP 6: Configure Domain
```
1. Go to domain registrar (GoDaddy, Namecheap, etc.)
2. Go to DNS settings
3. Find "A" record
4. Change value to: your-elastic-ip
5. Wait for DNS propagation (5-30 minutes)
```

Verify DNS:
```bash
nslookup yourdomain.com
# Should return your Elastic IP
```

### STEP 7: Get SSL Certificate
```bash
# On EC2:
cd /opt/uber-clone

# Get free SSL certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email: your-email@example.com
# - Agree to terms: (A)
# - Share email: (N or Y)

# Certificate auto-renewal is automatic
```

### STEP 8: Deploy Application
```bash
# On EC2:
cd /opt/uber-clone
./deploy.sh

# Wait for all services to start
# Should see "✅ Deployment complete!"
```

### STEP 9: Verify Deployment
```bash
# Check if services are running
docker-compose -f docker-compose.prod.yml ps

# Expected output:
# api-gateway         Up (healthy)
# user-service        Up (healthy)
# ride-service        Up (healthy)
# notification-service Up (healthy)
# frontend            Up (healthy)
# mongodb-users       Up (healthy)
# mongodb-rides       Up (healthy)
# redis               Up (healthy)

# Test health endpoints
curl https://yourdomain.com/health
curl https://yourdomain.com/api/health

# Should return: {"status":"ok"} or similar
```

### STEP 10: Setup GitHub Actions for Auto-Deploy
```
1. Go to GitHub: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add secrets:

Secret 1: EC2_HOST
Value: yourdomain.com (or your-elastic-ip)

Secret 2: EC2_PRIVATE_KEY
Value: (contents of uber-clone-key.pem file)

Secret 3: SLACK_WEBHOOK (optional)
Value: (webhook URL from Slack - skip if not using)
```

To get the private key:
```bash
# On Windows PowerShell
$content = [System.IO.File]::ReadAllText("C:\Users\user\.ssh\uber-clone-key.pem")
$content | Set-Clipboard
# Now paste into GitHub secret
```

### STEP 11: Test Auto-Deployment
```bash
# Make a small change locally
cd C:\Users\user\Music\U-C Project
echo "# Updated" >> README.md

# Push to GitHub
git add .
git commit -m "Test auto-deployment"
git push origin main

# Watch GitHub Actions:
# 1. Go to GitHub Actions tab
# 2. Watch the workflow run
# 3. Should see: test → build → deploy

# After ~5 minutes, application should be updated automatically!
```

---

## 📊 Post-Deployment Verification

### Application Access
```
✅ Frontend: https://yourdomain.com
✅ API: https://yourdomain.com/api
✅ Health: https://yourdomain.com/health

All should return HTTP 200 with green HTTPS lock
```

### Service Health
```bash
# SSH to EC2
ssh -i $KEY ubuntu@$IP

# Check all services
docker-compose -f /opt/uber-clone/docker-compose.prod.yml ps

# View logs
docker-compose -f /opt/uber-clone/docker-compose.prod.yml logs -f

# Monitor resources
docker stats
free -h
df -h
```

### Database Connection
```bash
# Test MongoDB
docker-compose -f /opt/uber-clone/docker-compose.prod.yml exec mongodb-users mongosh users_db

# Test Redis
docker-compose -f /opt/uber-clone/docker-compose.prod.yml exec redis redis-cli ping
```

---

## 🔧 Ongoing Maintenance

### Daily Tasks
```bash
# Monitor logs
docker-compose -f /opt/uber-clone/docker-compose.prod.yml logs -f

# Check health (automated every 5 minutes)
/opt/uber-clone/health-check.sh
```

### Weekly Tasks
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Verify backups exist
ls -la /opt/uber-clone/backups/
```

### Monthly Tasks
```bash
# Check SSL certificate expiry
sudo certbot certificates

# Review logs for errors
sudo tail -100 /var/log/nginx/uber_error.log

# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart services (zero downtime)
docker-compose -f /opt/uber-clone/docker-compose.prod.yml restart
```

### Quarterly Tasks
```bash
# Review and optimize MongoDB indexes
# Review CloudWatch metrics (if using)
# Test restore from backup
# Update Docker images to latest
```

---

## 🚨 Troubleshooting

### Services not starting
```bash
docker-compose -f /opt/uber-clone/docker-compose.prod.yml logs

# Check if services have resources
docker stats

# Restart services
docker-compose -f /opt/uber-clone/docker-compose.prod.yml restart
```

### Out of memory
```bash
# t2.micro only has 1 GB RAM!
free -h

# Check what's using memory
docker stats

# Restart to free memory
docker-compose -f /opt/uber-clone/docker-compose.prod.yml restart
```

### Domain not resolving
```bash
# Check DNS propagation
nslookup yourdomain.com
dig yourdomain.com @8.8.8.8

# Wait 5-30 minutes for propagation
# Or update DNS server if using multiple
```

### HTTPS not working
```bash
# Check certificate
sudo certbot certificates

# Verify NGINX config
sudo nginx -t

# Check NGINX error logs
sudo tail -f /var/log/nginx/uber_error.log

# Restart NGINX
sudo systemctl restart nginx
```

### Services crashing
```bash
# Check logs
docker-compose -f /opt/uber-clone/docker-compose.prod.yml logs api-gateway

# Restart specific service
docker-compose -f /opt/uber-clone/docker-compose.prod.yml restart api-gateway

# Check if .env.prod values are correct
nano /opt/uber-clone/.env.prod
```

---

## 📈 Cost Tracking

### AWS Free Tier (First 12 Months)
```
EC2 t2.micro        FREE (750 hours/month)
EBS storage 30 GB   FREE
Data transfer IN    FREE (unlimited)
Data transfer OUT   FREE (1 GB/month)
Elastic IP          FREE (if attached)

TOTAL: $0/month
```

### After 12 Months
```
EC2 t2.micro        ~$10/month
EBS storage 30 GB   ~$3/month
Data transfer OUT   $0.09/GB (if over 1 GB)
Elastic IP          FREE (if attached)

TOTAL: ~$13-15/month
```

### Monitor Costs
```
AWS Console → Billing Dashboard
- Set billing alert at $50/month
- Check estimated charges monthly
- Use AWS Calculator for estimation
```

---

## 🎉 Success Criteria

You've successfully deployed when:

- [x] Application accessible at https://yourdomain.com
- [x] All services running and healthy
- [x] GitHub Actions auto-deploy working
- [x] SSL certificate installed (green lock)
- [x] Backups automated
- [x] Health checks passing
- [x] Logs accessible
- [x] Team can access application

---

## 📞 Quick Commands Reference

```bash
# Deployment
/opt/uber-clone/deploy.sh

# Health check
/opt/uber-clone/health-check.sh

# Backup
/opt/uber-clone/backup.sh

# View logs
docker-compose -f /opt/uber-clone/docker-compose.prod.yml logs -f

# Status
docker-compose -f /opt/uber-clone/docker-compose.prod.yml ps

# Restart all
docker-compose -f /opt/uber-clone/docker-compose.prod.yml restart

# Stop all
docker-compose -f /opt/uber-clone/docker-compose.prod.yml down

# SSH to EC2
ssh -i C:\Users\user\.ssh\uber-clone-key.pem ubuntu@your-ip
```

---

**Total Setup Time: 1-2 hours**
**Monthly Cost After Free Tier: $13-15**
**Resume Value: ⭐⭐⭐⭐⭐**

Good luck! 🚀
