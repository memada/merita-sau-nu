#!/bin/bash
# Host-side daily backup. Linux droplet: bash, flock, docker compose.
set -euo pipefail
umask 077
cd "${APP_DIR:-/srv/merita-sau-nu}"
# Root-owned, mode 600; executable admin configuration, never source an untrusted file.
if [[ -f /etc/merita-backup.env ]]; then source /etc/merita-backup.env; fi
: "${BACKUP_RETENTION_DAYS:=30}"
: "${BACKUP_EXPORT_DIR:=/var/backups/merita-sau-nu}"
[[ "$BACKUP_RETENTION_DAYS" =~ ^[1-9][0-9]*$ ]] || { echo 'Invalid backup retention' >&2; exit 1; }
mkdir -p "$BACKUP_EXPORT_DIR"
chmod 700 "$BACKUP_EXPORT_DIR"
exec 9>"$BACKUP_EXPORT_DIR/.lock"
flock -n 9 || { echo 'Backup already running' >&2; exit 1; }
# JSON mode returns only the generated filename, never database contents.
result=$(docker compose exec -T merita-sau-nu node scripts/backup.mjs --json)
name=$(printf '%s' "$result" | python3 -c 'import json,sys; print(json.load(sys.stdin)["filename"])')
[[ "$name" =~ ^leads-[0-9TZ-]+\.sqlite$ ]] || { echo 'Invalid backup filename' >&2; exit 1; }
export BACKUP_FILE="$BACKUP_EXPORT_DIR/$name"
docker compose cp "merita-sau-nu:/app/backups/$name" "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"
if [[ -z "${BACKUP_UPLOAD_COMMAND:-}" ]]; then
  echo 'Backup local saved; OFFSITE NOT CONFIGURED. Set BACKUP_UPLOAD_COMMAND.' >&2
  exit 1
fi
# Trusted command configured by administrator; credentials stay outside the repository.
# Do not use set -x or print the command / provider errors (may contain credentials).
if ! bash -c "$BACKUP_UPLOAD_COMMAND" >/dev/null 2>&1; then
  echo 'Offsite upload failed; local backups retained, retention skipped.' >&2
  exit 1
fi
# Prune only this app's backups, only after a successful offsite upload.
find "$BACKUP_EXPORT_DIR" -maxdepth 1 -type f -name 'leads-*.sqlite' -mtime +"$BACKUP_RETENTION_DAYS" -delete
docker compose exec -T merita-sau-nu node scripts/backup.mjs --prune-only --retention-days "$BACKUP_RETENTION_DAYS"
echo 'Backup uploaded; local retention applied. Verify remote retention and restore separately.'
