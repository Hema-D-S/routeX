# Notification Service Dockerfile
FROM node:18-alpine AS builder

WORKDIR /build

COPY services/notification-service/package*.json ./
RUN npm ci --legacy-peer-deps

FROM node:18-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY services/notification-service/package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules
COPY --chown=nodejs:nodejs services/notification-service/src ./src
COPY --chown=nodejs:nodejs services/notification-service/firebase-key.json ./firebase-key.json

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

USER nodejs

CMD ["node", "src/app.js"]
