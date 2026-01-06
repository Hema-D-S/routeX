#!/bin/bash

# GitHub Webhook Receiver for automated deployments
# This script runs on EC2 and listens for GitHub webhooks

const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');

const PORT = 9000;
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'webhook-secret';
const DEPLOY_DIR = '/opt/uber-clone';
const LOG_FILE = '/var/log/uber-webhook.log';

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage, { flag: 'a' });
}

function verifySignature(req, body) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return false;
  }

  const hash = crypto
    .createHmac('sha256', SECRET)
    .update(body)
    .digest('hex');

  return `sha256=${hash}` === signature;
}

function deploy() {
  try {
    log('🚀 Starting deployment...');

    process.chdir(DEPLOY_DIR);

    // Pull latest code
    log('📦 Pulling latest code from main branch...');
    execSync('git fetch origin main', { stdio: 'inherit' });
    execSync('git reset --hard origin/main', { stdio: 'inherit' });

    // Pull Docker images
    log('🐳 Pulling latest Docker images...');
    execSync('docker-compose -f docker-compose.prod.yml pull', { stdio: 'inherit' });

    // Start services
    log('🔨 Starting services...');
    execSync('docker-compose -f docker-compose.prod.yml up -d', { stdio: 'inherit' });

    // Wait for services
    log('⏳ Waiting for services to be ready...');
    execSync('sleep 10');

    // Check status
    log('📊 Checking service status...');
    const status = execSync('docker-compose -f docker-compose.prod.yml ps', { encoding: 'utf-8' });
    log(status);

    log('✅ Deployment completed successfully!');
    return true;
  } catch (error) {
    log(`❌ Deployment failed: ${error.message}`);
    return false;
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString('utf8');
  });

  req.on('end', () => {
    // Verify GitHub signature
    if (!verifySignature(req, body)) {
      log('⚠️  Invalid webhook signature');
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }

    try {
      const payload = JSON.parse(body);

      // Only deploy on push to main
      if (payload.ref === 'refs/heads/main' && payload.repository) {
        log(`📨 Webhook received from ${payload.repository.full_name}`);
        log(`👤 Pushed by: ${payload.pusher.name}`);

        const success = deploy();

        res.writeHead(success ? 200 : 500);
        res.end(success ? 'Deployment successful' : 'Deployment failed');
      } else {
        log(`⏭️  Skipping deployment (branch: ${payload.ref})`);
        res.writeHead(200);
        res.end('OK');
      }
    } catch (error) {
      log(`❌ Error processing webhook: ${error.message}`);
      res.writeHead(400);
      res.end('Bad request');
    }
  });
});

server.listen(PORT, () => {
  log(`🎧 Webhook receiver listening on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log('📛 Shutting down webhook receiver...');
  server.close(() => {
    log('✅ Webhook receiver stopped');
    process.exit(0);
  });
});
