#!/bin/bash

# Backup MongoDB data
BACKUP_DIR="/opt/uber-clone/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "Backing up databases..."

# Backup users database
docker-compose -f docker-compose.prod.yml exec -T mongodb-users mongodump --db users_db --out /data/db/backup_$DATE

# Backup rides database
docker-compose -f docker-compose.prod.yml exec -T mongodb-rides mongodump --db rides_db --out /data/db/backup_$DATE

# Compress backups
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/backup_$DATE/

# Keep only last 7 backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_DIR/backup_$DATE.tar.gz"
