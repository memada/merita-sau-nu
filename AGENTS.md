# Project memory — Merită sau Nu

Read [the project wiki](docs/wiki/README.md) before deployment or infrastructure work.
This repository is independent of CuStrăini. UI and operational explanations use Romanian.

## Confirmed production configuration (30 October 2026)

- Repository: `memada/merita-sau-nu`; local checkout `~/merita-sau-nu`.
- Canonical origin: `https://meritasaunu.com`; admin: `/admin`.
- Droplet: `134.122.72.18`, deploy user `root`, directory `/srv/merita-sau-nu`.
- Image: `registry.digitalocean.com/kiduu-test/merita-sau-nu:latest`.
- Host binding: `127.0.0.1:3002` → container `3000`. CuStrăini uses host `3001`.
- SQLite: `/app/data/leads.sqlite`; persistent volume `merita-sau-nu-data`.
- Tunnel: `my-hello`, ID `6ed3c137-0227-4717-9911-cd9546dec3df`.
- Configure published application routes in the Cloudflare dashboard; both public
  hostnames point to `http://127.0.0.1:3002`. DNS alone does not publish the service.
- The service runs `/usr/local/bin/cloudflared tunnel run my-hello`, with no explicit
  config argument. The proposed `merita-config.conf` systemd override does NOT exist.
  Do not infer the effective routing source from local config files or missing token flags.
- Last checked: tunnel active/enabled, container healthy, local/public homepage and
  both public health endpoints return 200; user confirmed a submitted lead in admin.
- Production `TRUST_CF_HEADERS=false`; GA not configured. Do not claim these were enabled.

## Working conventions

- User requirement: with every project change, update README.md and the relevant Markdown documentation (wiki, runbook, verification or checklist) so they match the implementation.

- Preserve Next.js App Router, TypeScript, Node 24, npm, standalone Docker and SQLite.
- Pure business rules live in `lib`; shared Zod schemas validate client and server.
- Use the public npm registry; keep `.npmrc` and public lockfile URLs.
- Production ENV is provisioned separately; CI must not overwrite `/srv/merita-sau-nu/.env`.
- Never commit ENV values, tokens, password hashes, private keys, lead records, DBs,
  exports, backups or private screenshots. Record variable names and public topology only.
- Do not touch CuStrăini's repository/container/routes/registry images or run global pruning.
- Every push on `main` triggers production deployment. A documentation push also does.
- Image policy: retain only the latest application image after successful deploy/public health.
  Keep the single-platform flags and the full safety logic in `deploy/cleanup-registry.sh`:
  JSON parsing, current manifest graph protection, deferred referenced-child deletion,
  latest-change checks, bounded eventual-consistency verification, repository restriction.
- SSH uses native OpenSSH, verified RSA host fingerprint, strict checking and RSA-SHA2.
  Deployment identity is Ed25519; this is distinct from the server's RSA host identity.
- Four operator/disclosure fields must be set to accept production lead submissions.
  Use real data, never invent legal identity or suppliers. See wiki for the 503 diagnosis.
- Status SENT_TO_SUPPLIERS is a manual record; changing it does not send any messages.

## Validation and handoff

- Run checks appropriate to changes. `npm test`, `npm run typecheck`; production build
  for app/build changes. Shell/cleanup changes require relevant regression tests.
- Browser tests: `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` after build; isolated DB.
- Update wiki when production behavior or operational assumptions change. Distinguish
  observed state from proposed changes and historical steps that were never executed.
- Keep terminal commands in fenced blocks; avoid link formatting inside shell commands.
- If browser resets but droplet/public health succeeds, test another network/device
  before changing infrastructure. Corporate VPN affected Mac access during launch.

## CodeGraph

If `.codegraph/` exists at the repository root, use CodeGraph before textual code
searches or source reads to locate/understand code. Otherwise skip it; do not index
unless requested. `codegraph explore "<question or symbols>"` is the shell entrypoint.

## Production-readiness policy (31 October 2026)

Read `docs/PRODUCTION_READINESS.md` and `PRE_LAUNCH_CHECKLIST.md` before deploying.
The new candidate rejects production config without TRUST_CF_HEADERS=true; the
historical live value above is not evidence that the new policy was deployed.
Daily/offsite backup integration and Cloudflare Access require manual setup.
Keep centralized startup/preflight/health validation and never log ENV values.
Source packages include tracked files only, exclude every .env\*, and never include DBs.
