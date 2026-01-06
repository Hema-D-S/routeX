#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting Uber Clone Deployment...${NC}"

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo -e "${RED}❌ Error: .env.prod file not found!${NC}"
    echo "Please create .env.prod with required environment variables"
    exit 1
fi

# Load environment variables
set -a
source .env.prod
set +a

echo -e "${YELLOW}📦 Pulling latest code from GitHub...${NC}"
git fetch origin main
git reset --hard origin/main

echo -e "${YELLOW}🐳 Pulling latest Docker images...${NC}"
docker-compose -f docker-compose.prod.yml pull

echo -e "${YELLOW}🔨 Building Docker images...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

echo -e "${YELLOW}📊 Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Services Status:"
docker-compose -f docker-compose.prod.yml ps --format "table {{.Container}}\t{{.Status}}\t{{.Ports}}"

# Verify health endpoints
echo ""
echo -e "${YELLOW}🏥 Verifying health endpoints...${NC}"
sleep 2

HEALTH_CHECKS=(
  "http://localhost/api/health"
  "http://localhost:3000/health"
  "http://localhost:3001/health"
  "http://localhost:3002/health"
  "http://localhost:3003/health"
)

for url in "${HEALTH_CHECKS[@]}"; do
  if curl -s -f "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ $url${NC}"
  else
    echo -e "${RED}❌ $url${NC}"
  fi
done

echo ""
echo -e "${GREEN}🎉 All services deployed successfully!${NC}"
echo "Access your application at: https://${DOMAIN_NAME:-yourdomain.com}"
