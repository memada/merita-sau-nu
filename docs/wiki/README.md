# Wiki — Merită sau Nu

Memoria tehnică și operațională a proiectului, păstrată în același repository cu
aplicația. Ultima confirmare în producție: **30 octombrie 2026**, fus orar
`Europe/Bucharest`. Aceste pagini descriu rezultatul final al lansării; propunerile
neexecutate din conversație nu sunt tratate ca infrastructură existentă.

## Navigare

- [Arhitectură și reguli de business](architecture.md)
- [Deploy, GitHub Actions, domeniu și tunel](deployment.md)
- [Operațiuni, ENV, backup și recuperare](operations.md)
- [Depanare și incidente rezolvate](troubleshooting.md)
- [Decizii, verificări și lucruri rămase](decisions.md)
- [Instrucțiuni pentru colaboratori și agenți](../../AGENTS.md)

## Stare confirmată

| Componentă                   | Configurație / rezultat                                         |
| ---------------------------- | --------------------------------------------------------------- |
| Site canonic                 | https://meritasaunu.com                                         |
| Admin                        | https://meritasaunu.com/admin                                   |
| Repository                   | https://github.com/memada/merita-sau-nu                         |
| Checkout local               | `~/merita-sau-nu`, separat de `~/CuStraini`                     |
| Droplet                      | `134.122.72.18`, utilizator deploy `root`, arhitectură `x86_64` |
| Director producție           | `/srv/merita-sau-nu`                                            |
| Container / serviciu Compose | `merita-sau-nu`                                                 |
| Port                         | `127.0.0.1:3002` pe host → `3000` în container                  |
| Imagine                      | `registry.digitalocean.com/kiduu-test/merita-sau-nu:latest`     |
| Politică registry            | O singură imagine `latest`, verificată după curățare            |
| DB                           | SQLite `/app/data/leads.sqlite`                                 |
| Volum DB                     | `merita-sau-nu-data`                                            |
| Volum backup                 | `merita-sau-nu-backups`                                         |
| ENV pe droplet               | `/srv/merita-sau-nu/.env`, mod `600`, neversionat               |
| Cloudflare Tunnel            | `my-hello` / `6ed3c137-0227-4717-9911-cd9546dec3df`             |
| Nameservere                  | `ligia.ns.cloudflare.com`, `ryan.ns.cloudflare.com`             |
| Registrar                    | Namecheap; domeniu activ în Cloudflare                          |
| Health                       | Local, domeniu principal și www: HTTP 200                       |
| Flux funcțional              | Utilizatorul a trimis o cerere pe site și a văzut-o în admin    |

Cererile HTTP de producție au fost verificate direct pe droplet; verificarea
fluxului în browser și a leadului este confirmată de utilizator. Valorile actuale
ale secretelor și datele din leaduri nu sunt documentate aici.

## Ce este automat și ce este manual

Push pe `main` → teste → build imagine → push DOCR → deploy SSH/Compose → health
public → eliminare imagini vechi. Baza de date rămâne în volum persistent.

Datele operatorului, cheia SSH, tokenul DO și parola admin sunt configurate separat.
Verificarea leadurilor și transmiterea către maximum 3 furnizori sunt manuale.

## Reguli pentru actualizarea wiki-ului

Actualizează pagina relevantă când se schimbă ENV, domeniu, porturi, tunel,
workflow, schemă DB sau regulile calculatorului. Nu copia secrete, exporturi de
leaduri sau conversația integrală. Înregistrează data și dovada verificării; dacă
un detaliu nu a fost confirmat, marchează-l explicit.

## Production-readiness pass ulterior

Vezi [runbook-ul din 31 octombrie](../PRODUCTION_READINESS.md) și
[checklist-ul](../../PRE_LAUNCH_CHECKLIST.md). Acestea descriu noua validare și
backupul pregătit în cod; nu confirmă instalarea lor pe droplet.
