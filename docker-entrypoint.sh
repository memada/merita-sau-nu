#!/bin/sh
set -eu
umask 077
node scripts/migrate.mjs
exec node server.js
