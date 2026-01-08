#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Uber Clone Deployment Update Script${NC}"
echo -e "${YELLOW}========================================${NC}"

# Change to project directory
cd ~/routeX || { echo -e "${RED}Error: Could not change to ~/routeX${NC}"; exit 1; }

# Step 1: Pull latest code from GitHub
echo -e "\n${YELLOW}[1/5] Pulling latest code from GitHub...${NC}"
if git pull origin main; then
    echo -e "${GREEN}✓ Code updated successfully${NC}"
else
    echo -e "${RED}✗ Failed to pull code${NC}"
    exit 1
fi

# Step 2: Build Docker images without cache
echo -e "\n${YELLOW}[2/5] Building Docker images...${NC}"
if docker-compose -f docker-compose.prod.yml build --no-cache; then
    echo -e "${GREEN}✓ Images built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build images${NC}"
    exit 1
fi

# Step 3: Stop running containers
echo -e "\n${YELLOW}[3/5] Stopping running containers...${NC}"
if docker-compose --env-file .env.prod -f docker-compose.prod.yml down; then
    echo -e "${GREEN}✓ Containers stopped${NC}"
else
    echo -e "${RED}✗ Failed to stop containers${NC}"
    exit 1
fi

# Step 4: Start new containers
echo -e "\n${YELLOW}[4/5] Starting new containers...${NC}"
if docker-compose --env-file .env.prod -f docker-compose.prod.yml up -d; then
    echo -e "${GREEN}✓ Containers started${NC}"
else
    echo -e "${RED}✗ Failed to start containers${NC}"
    exit 1
fi

# Step 5: Show status
echo -e "\n${YELLOW}[5/5] Checking service status...${NC}"
docker-compose ps

# Show summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment updated successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${YELLOW}Service URLs:${NC}"
echo -e "  Frontend: https://routex-uclone.duckdns.org"
echo -e "  API: https://routex-uclone.duckdns.org/api"
echo -e "  Health: https://routex-uclone.duckdns.org/health"
echo -e "\n${YELLOW}To view logs:${NC}"
echo -e "  docker-compose logs -f api-gateway"
echo -e "  docker-compose logs -f user-service"
