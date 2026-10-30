# Deploy, GitHub Actions și Cloudflare

[Înapoi la wiki](README.md)

## Infrastructura existentă

| Componentă         | Valoare                                    |
| ------------------ | ------------------------------------------ |
| GitHub             | `memada/merita-sau-nu`, branch `main`      |
| Droplet            | `root@134.122.72.18`, x86_64 / linux-amd64 |
| Director           | `/srv/merita-sau-nu`                       |
| Registry           | `registry.digitalocean.com/kiduu-test`     |
| Repository imagine | `merita-sau-nu`                            |
| Port host          | `127.0.0.1:3002`                           |
| Port container     | `3000`                                     |
| Restart policy     | `unless-stopped`                           |

Docker 29.2.1 și Compose v5.0.2 au fost raportate de droplet la lansare.
Serverul este partajat cu CuStrăini (`custraini-frontend`, host 3001).
Nu rula prune global, nu reutiliza volumele celuilalt proiect și nu reinstala tunelul.

## GitHub: Variables versus Secrets

Settings → Secrets and variables → Actions.

| Repository variable             | Valoare                                                         |
| ------------------------------- | --------------------------------------------------------------- |
| `APP_URL`                       | `https://meritasaunu.com`                                       |
| `DOCR_IMAGE`                    | `registry.digitalocean.com/kiduu-test/merita-sau-nu` (fără tag) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Opțional; neconfigurat la lansare                               |

| Repository secret          | Semnificație                                                   |
| -------------------------- | -------------------------------------------------------------- |
| `DOCR_ACCESS_TOKEN`        | Token DigitalOcean pentru push/pull/listare/ștergere manifeste |
| `DOCR_USERNAME`            | Emailul contului DigitalOcean folosit la docker login          |
| `DOCR_REGISTRY`            | `registry.digitalocean.com`                                    |
| `DROPLET_IP`               | `134.122.72.18`                                                |
| `DROPLET_USER`             | `root`                                                         |
| `DROPLET_SSH_KEY`          | Cheia privată dedicată deploy-ului, în întregime               |
| `DROPLET_HOST_FINGERPRINT` | Amprenta RSA SHA256 verificată pe droplet                      |

Cheia privată locală este `~/.ssh/merita-sau-nu-deploy`; cheia publică are sufixul
`.pub` și a fost instalată cu ssh-copy-id. Conținutul cheilor și tokenurilor nu
se pune în wiki sau în mesaje. Cheia de autentificare este Ed25519; cheia de
identitate a serverului folosită de workflow este RSA, cu semnături RSA-SHA2.

Amprenta **publică** RSA confirmată la lansare:

```text
SHA256:K3OYkzEq8C51//i0SjLtZcCkGZc0u8H+G4zQUBfp95U
```

Verifică pe droplet înainte de a actualiza secretul după reinstalare/rotire:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_rsa_key.pub -E sha256
```

## Pipeline-ul efectiv

Sursa de adevăr: [deploy.yml](../../.github/workflows/deploy.yml).

1. Push pe main sau Run workflow manual.
2. Node 24, npm ci, teste și TypeScript.
3. Login DOCR și build `linux/amd64`, `--provenance=false --sbom=false --load`.
4. Push doar cu tagul `latest`.
5. OpenSSH: citește cheia RSA publică prezentată, compară SHA256 cu secretul,
   configurează strict host checking și RSA-SHA2. Nu ignoră verificarea hostului.
6. Copiază Compose și deploy.sh; nu suprascrie `.env`.
7. Login pe droplet, backup DB dacă aplicația rulează deja, pull, recreate și wait
   până la healthy. Elimină local doar imaginea înlocuită, fără force.
8. Elimină cheia temporară de pe runner; verifică domeniul public `/api/health`.
9. Login DOCR pe runnerul de deploy, doctl și curățare registry.

Fiecare job are runner separat: autentificarea Docker din build nu există automat
în deploy. ENV runtime nu este transmis din GitHub către aplicație; este în `.env`
pe droplet. Configurația APP_URL trebuie să coincidă la build și runtime.

## Politica imaginilor

Păstrăm o singură imagine `latest`, după succesul deploy-ului și health-ului public.
Nu păstrăm taguri SHA pentru rollback. Rebuild-ul unui commit anterior este necesar
pentru recuperarea unei versiuni eliminate.

[cleanup-registry.sh](../../deploy/cleanup-registry.sh) este limitat la acest
repository, parsează JSON, normalizează digesturi cu/fără prefix, protejează
întregul graf de manifeste al lui latest și oprește curățarea dacă latest se schimbă.
Manifestele vechi referite de indexuri vechi se amână la eroarea specifică 412;
se șterg părinții, apoi se reîncearcă. Fiecare trecere trebuie să facă progres.
Alte erori sunt raportate, nu ignorate.

Lista registry-ului poate reflecta ștergerile cu întârziere. Verificarea finală
face maximum 6 citiri, cu 5 secunde între ele. Rezultatul confirmat în producție:

```text
Cleanup verified: 1 current manifest(s) remain.
```

O ștergere de manifest nu echivalează cu o măsurare a spațiului fizic recuperat.
Nu a fost configurată garbage collection automată la nivelul registry-ului partajat.

## Domeniu și tunel — configurația care a funcționat

Domeniul a fost cumpărat la Namecheap și conectat în Cloudflare (Free). În
Namecheap → Domain List → Manage → Nameservers → Custom DNS:

```text
ligia.ns.cloudflare.com
ryan.ns.cloudflare.com
```

Așteaptă statusul Active. Tunelul existent:

```text
my-hello
6ed3c137-0227-4717-9911-cd9546dec3df
```

**DNS și Published application routes sunt două legături distincte.**

În Cloudflare → DNS → Records, ambele intrări sunt proxied, TTL Auto:

| Tip inițial configurat | Name  | Target                                                  |
| ---------------------- | ----- | ------------------------------------------------------- |
| CNAME                  | `@`   | `6ed3c137-0227-4717-9911-cd9546dec3df.cfargotunnel.com` |
| CNAME                  | `www` | `6ed3c137-0227-4717-9911-cd9546dec3df.cfargotunnel.com` |

Dashboard-ul le afișează ca **Tunnel → my-hello**. Vechiul A spre
`192.64.119.126` și CNAME-ul de parking pentru www au fost înlocuite.
Înregistrările MX și TXT existente au fost păstrate.

În Cloudflare → Tunnels → my-hello → Routes → Add route → Published application:

| Subdomain | Domain            | Path | Service URL             |
| --------- | ----------------- | ---- | ----------------------- |
| gol       | `meritasaunu.com` | gol  | `http://127.0.0.1:3002` |
| `www`     | `meritasaunu.com` | gol  | `http://127.0.0.1:3002` |

Textul gri „www” din input este un placeholder; trebuie tastat pentru a doua rută.
Sunt păstrate și cele 4 rute vechi: custraini.com, www.custraini.com,
ui.stagging.fit și ui.stagging.fit/api/\*. Rezultatul final din dashboard: 6 rute.

## Serviciul cloudflared și fișierele locale

Confirmat direct pe server după lansare:

```text
/usr/local/bin/cloudflared tunnel run my-hello
systemctl is-active cloudflared → active
systemctl is-enabled cloudflared → enabled
```

Nu are argument explicit `--config`. Nu există fișierul systemd override
`/etc/systemd/system/cloudflared.service.d/merita-config.conf` propus în timpul
depanării. Nu îl crea ca parte a deploy-ului normal.

Există `/root/.cloudflared/config.yml` și `/etc/cloudflared/config.yml`. În shell-ul
root, `cloudflared tunnel ingress validate` selecta primul fișier, dar acest lucru
nu demonstra sursa rutelor efective ale serviciului. Modificarea fișierului local
și restartul nu au rezolvat 404; adăugarea rutelor în dashboard a fost urmată de 200.
Fișierul `/etc` avea și un hostname/path invalid. Nu copia acea configurație peste
cea funcțională și nu modifica rutele altor aplicații pentru a repara acest proiect.
Exemplul local din `deploy/` este doar o alternativă pentru tuneluri gestionate local.

Ruta www există, dar o redirecționare www → domeniul canonic nu a fost confirmată.
Folosește domeniul fără www pentru admin/formulare: verificarea Origin este strictă.

## Referințe

- [Cloudflare: publicarea unei aplicații prin tunel](https://developers.cloudflare.com/tunnel/get-started/)
- [Docker: atestări și manifestele suplimentare](https://docs.docker.com/build/metadata/attestations/)
- [DigitalOcean: ștergerea manifestelor](https://docs.digitalocean.com/reference/doctl/reference/registry/repository/delete-manifest/)
