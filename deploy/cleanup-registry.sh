#!/usr/bin/env bash
set -euo pipefail
# Intentionally restricted to this application's repository.
if [[ ! "${DOCR_IMAGE:-}" =~ ^registry\.digitalocean\.com/([a-z0-9-]+)/merita-sau-nu$ ]]; then
  echo 'Unexpected DOCR_IMAGE; refusing image deletion.' >&2
  exit 1
fi
registry="${BASH_REMATCH[1]}"
repository=merita-sau-nu
latest_digest() {
  doctl registry repository list-tags "$repository" --registry "$registry" --format Tag,ManifestDigest --no-header |
    awk '$1 == "latest" {print $2}'
}
keep=$(latest_digest)
if [[ ! "$keep" =~ ^sha256:[a-f0-9]{64}$ ]]; then
  echo 'Cannot resolve one valid latest digest; refusing image deletion.' >&2
  exit 1
fi
manifests=$(doctl registry repository list-manifests "$repository" --registry "$registry" --format Digest --no-header)
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
