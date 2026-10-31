#!/bin/sh
set -eu
cd /srv/merita-sau-nu
# .env is provisioned once by the administrator; never overwritten by CI.
# Take a consistent pre-deploy backup when an existing container is running.
if docker compose ps --status running --services | grep -qx merita-sau-nu; then
  docker compose exec -T merita-sau-nu node scripts/backup.mjs
fi
previous_image=$(docker inspect --format '{{.Image}}' merita-sau-nu 2>/dev/null || true)
docker compose pull
# Validate the candidate with runtime ENV before replacing the running app or migrating DB.
docker compose run --rm --no-deps --entrypoint node merita-sau-nu scripts/check-production-config.mjs
docker compose up -d --force-recreate --wait --wait-timeout 120
# Remove only the replaced image, after the new container is healthy.
# No --force: Docker protects images referenced by any other container.
current_image=$(docker inspect --format '{{.Image}}' merita-sau-nu)
if [ -n "$previous_image" ] && [ "$previous_image" != "$current_image" ]; then
  docker image rm "$previous_image" || printf '%s\n' 'Previous image still referenced; kept locally.'
fi
# No global image pruning: the droplet may run other applications.
