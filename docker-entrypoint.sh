#!/bin/sh
set -eu
umask 077
node scripts/check-production-config.mjs
node scripts/migrate.mjs
exec node server.js
