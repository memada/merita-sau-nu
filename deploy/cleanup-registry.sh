#!/usr/bin/env bash
set -euo pipefail
# Intentionally restricted to this application's repository.
if [[ ! "${DOCR_IMAGE:-}" =~ ^registry\.digitalocean\.com/([a-z0-9-]+)/merita-sau-nu$ ]]; then
  echo 'Unexpected DOCR_IMAGE; refusing image deletion.' >&2
  exit 1
fi
registry="${BASH_REMATCH[1]}"
repository=merita-sau-nu
normalize_digest() {
  local value="${1#sha256:}"
  if [[ ! "$value" =~ ^[a-f0-9]{64}$ ]]; then
    echo 'Invalid registry digest; refusing image deletion.' >&2
    return 1
  fi
  printf 'sha256:%s\n' "$value"
}
latest_digest() {
  local value
  value=$(doctl registry repository list-tags "$repository" --registry "$registry" --output json |
    jq -er '[.[] | select(.tag == "latest") | .manifest_digest] |
      if length == 1 and (.[0] | type == "string") then .[0]
      else error("Expected exactly one latest digest") end')
  normalize_digest "$value"
}
keep=$(latest_digest)
if [[ ! "$keep" =~ ^sha256:[a-f0-9]{64}$ ]]; then
  echo 'Cannot resolve one valid latest digest; refusing image deletion.' >&2
  exit 1
fi
raw_manifests=$(doctl registry repository list-manifests "$repository" --registry "$registry" --output json |
  jq -er '.[] | .digest | if type == "string" then . else error("Invalid manifest") end')
manifests=""
for digest in $raw_manifests; do
  normalized=$(normalize_digest "$digest")
  manifests="$manifests $normalized"
done
for digest in $manifests; do
  if [[ ! "$digest" =~ ^sha256:[a-f0-9]{64}$ ]]; then
    echo 'Invalid manifest digest; refusing image deletion.' >&2
    exit 1
  fi
done
for digest in $manifests; do
  if [ "$digest" = "$keep" ]; then continue; fi
  if [ "$(latest_digest)" != "$keep" ]; then
    echo 'latest changed during cleanup; stopping without further deletion.' >&2
    exit 1
  fi
  doctl registry repository delete-manifest "$repository" "$digest" --registry "$registry" --force
done
printf 'Kept latest image: %s\n' "$keep"
