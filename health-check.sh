#!/bin/bash

# Health check script
SERVICES=(
  "http://localhost/api/health"
  "http://localhost:3000/health"
  "http://localhost:3001/health"
  "http://localhost:3002/health"
  "http://localhost:3003/health"
)

UNHEALTHY=0

for url in "${SERVICES[@]}"; do
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  service=$(echo "$url" | cut -d'/' -f4 | cut -d':' -f1)
  
  if [ "$response" -eq 200 ]; then
    echo "✅ $service is UP"
  else
    echo "❌ $service is DOWN (HTTP $response)"
    UNHEALTHY=$((UNHEALTHY + 1))
  fi
done

if [ $UNHEALTHY -gt 0 ]; then
  echo ""
  echo "⚠️  $UNHEALTHY service(s) unhealthy. Checking Docker status..."
  docker-compose -f /opt/uber-clone/docker-compose.prod.yml ps
  exit 1
fi

exit 0
