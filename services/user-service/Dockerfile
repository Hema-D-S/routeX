# User Service Dockerfile
FROM node:18-alpine AS builder

WORKDIR /build

COPY services/user-service/package*.json ./
RUN npm ci --legacy-peer-deps

FROM node:18-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY services/user-service/package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules
COPY --chown=nodejs:nodejs services/user-service/src ./src

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

USER nodejs

CMD ["node", "src/app.js"]
