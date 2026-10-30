#!/bin/sh
set -eu
cd /srv/merita-sau-nu
# .env is provisioned once by the administrator; never overwritten by CI.
# Take a consistent pre-deploy backup when an existing container is running.
if docker compose ps --status running --services | grep -qx merita-sau-nu; then
  docker compose exec -T merita-sau-nu node scripts/backup.mjs
fi
docker compose pull
docker compose up -d --force-recreate --wait --wait-timeout 120
# No global image pruning: the droplet may run other applications.
