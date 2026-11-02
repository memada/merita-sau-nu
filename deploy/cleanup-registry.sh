#!/usr/bin/env bash
set -euo pipefail
# Intentionally restricted to this application's repository.
if [[ ! "${DOCR_IMAGE:-}" =~ ^registry\.digitalocean\.com/([a-z0-9-]+)/merita-sau-nu$ ]]; then
  echo 'Unexpected DOCR_IMAGE; refusing image deletion.' >&2
  exit 1
fi
registry="${BASH_REMATCH[1]}"
verify_attempts=${REGISTRY_VERIFY_ATTEMPTS:-18}
verify_delay=${REGISTRY_VERIFY_DELAY_SECONDS:-10}
if [[ ! "$verify_attempts" =~ ^[1-9][0-9]?$ ]] || (( verify_attempts > 30 )); then
  echo 'Invalid REGISTRY_VERIFY_ATTEMPTS (expected 1-30); refusing image deletion.' >&2
  exit 1
fi
if [[ ! "$verify_delay" =~ ^(0|[1-9][0-9]?)$ ]] || (( verify_delay > 30 )); then
  echo 'Invalid REGISTRY_VERIFY_DELAY_SECONDS (expected 0-30); refusing image deletion.' >&2
  exit 1
fi
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
# A tag can refer to an index, whose untagged children are required for pulls.
# Resolve the entire current manifest graph BEFORE deleting anything.
protected=" "
collect_current_manifest() {
  local digest raw media_type children child
  digest=$(normalize_digest "$1")
  case "$protected" in *" $digest "*) return ;; esac
  protected="$protected$digest "
  raw=$(docker buildx imagetools inspect --raw "$DOCR_IMAGE@$digest")
  media_type=$(printf '%s' "$raw" | jq -er '.mediaType')
  case "$media_type" in
    application/vnd.oci.image.index.v1+json|application/vnd.docker.distribution.manifest.list.v2+json)
      children=$(printf '%s' "$raw" | jq -er '.manifests | if type == "array" and length > 0 then .[].digest else error("Invalid image index") end')
      for child in $children; do collect_current_manifest "$child"; done
      ;;
    application/vnd.oci.image.manifest.v1+json|application/vnd.docker.distribution.manifest.v2+json)
      printf '%s' "$raw" | jq -e '.schemaVersion == 2 and (.config.digest | type == "string") and (.layers | type == "array")' > /dev/null
      ;;
    *) echo 'Unknown manifest type; refusing image deletion.' >&2; return 1 ;;
  esac
}
collect_current_manifest "$keep"
raw_manifests=$(doctl registry repository list-manifests "$repository" --registry "$registry" --output json |
  jq -er '.[] | .digest | if type == "string" then . else error("Invalid manifest") end')
manifests=""
for digest in $raw_manifests; do
  normalized=$(normalize_digest "$digest")
  manifests="$manifests $normalized"
done
pending=""
for digest in $manifests; do
  case "$protected" in *" $digest "*) continue ;; esac
  pending="$pending $digest"
done
# DO rejects deletion of a child while an old parent index still references it.
# Defer ONLY that specific 412 response, delete the old parents, then retry children.
# Every pass must delete something, so persistent references never cause a loop.
while [ -n "$pending" ]; do
  deferred=""
  progress=false
  for digest in $pending; do
    if [ "$(latest_digest)" != "$keep" ]; then
      echo 'latest changed during cleanup; stopping without further deletion.' >&2
      exit 1
    fi
    if output=$(doctl registry repository delete-manifest "$repository" "$digest" --registry "$registry" --force 2>&1); then
      progress=true
      printf 'Deleted old manifest: %s\n' "$digest"
    elif [[ "$output" == *412* && "$output" == *'manifest is referenced by one or more other manifests'* ]]; then
      deferred="$deferred $digest"
      printf 'Deferred referenced manifest until its old parent is removed: %s\n' "$digest"
    else
      printf '%s\n' "$output" >&2
      exit 1
    fi
  done
  if [ -n "$deferred" ] && [ "$progress" = false ]; then
    echo 'Remaining old manifests are still referenced; stopped without forcing deletion.' >&2
    exit 1
  fi
  pending="$deferred"
done
# The registry listing can briefly contain manifests whose DELETE already succeeded.
# Poll reads only; never delete additional images based on a stale final listing.
for (( attempt=1; attempt<=verify_attempts; attempt++ )); do
  if [ "$(latest_digest)" != "$keep" ]; then
    echo 'latest changed before final verification.' >&2
    exit 1
  fi
  remaining=$(doctl registry repository list-manifests "$repository" --registry "$registry" --output json |
    jq -r 'if type == "array" then .[] | .digest | if type == "string" then . else error("Invalid digest") end else error("Invalid manifest list") end')
  count=0
  found_latest=false
  old_present=false
  for digest in $remaining; do
    digest=$(normalize_digest "$digest")
    case "$protected" in *" $digest "*) ;; *) old_present=true ;; esac
    if [ "$digest" = "$keep" ]; then found_latest=true; fi
    count=$((count + 1))
  done
  if [ "$old_present" = false ] && [ "$found_latest" = true ]; then
    printf 'Cleanup verified: %s current manifest(s) remain. Latest: %s\n' "$count" "$keep"
    exit 0
  fi
  printf 'Registry verification %s/%s: latest visible=%s; older/unexpected manifests visible=%s; total=%s.\n' "$attempt" "$verify_attempts" "$found_latest" "$old_present" "$count"
  if [ "$attempt" -lt "$verify_attempts" ]; then
    printf 'Waiting for registry listing to reflect deletions (%s/%s).\n' "$attempt" "$verify_attempts"
    sleep "$verify_delay"
  fi
done
echo 'Registry listing did not converge after cleanup verification retries; deploy/public health already completed. Inspect registry state before retrying cleanup.' >&2
exit 1
