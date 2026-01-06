# Frontend React + Vite Dockerfile
FROM node:18-alpine AS builder

WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/ .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Install serve to run the app
RUN npm install -g serve

COPY --from=builder --chown=nodejs:nodejs /build/dist ./dist

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/ || exit 1

USER nodejs

CMD ["serve", "-s", "dist", "-l", "5173"]
