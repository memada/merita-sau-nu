# Merită sau Nu

MVP independent pentru proprietari din România: landing → calculator baterie
fotovoltaică → estimare orientativă → solicitare de până la 3 oferte → verificare
manuală în admin. Nu conține marketplace, plăți, conturi pentru instalatori sau
trimitere automată către furnizori.

## Wiki și configurație confirmată

[Wiki-ul proiectului](docs/wiki/README.md) documentează configurația finală de
producție, deploy-ul, ENV, backupurile, incidentele rezolvate și deciziile.
[AGENTS.md](AGENTS.md) păstrează contextul pentru sesiunile viitoare de lucru.

Site: **https://meritasaunu.com**. Admin: **https://meritasaunu.com/admin**.
Repository: **memada/merita-sau-nu**. Checkout local: `~/merita-sau-nu`, separat
de CuStrăini. Fluxul public → lead → admin a fost confirmat în producție.

## Stack și referință

Next.js 16 App Router, React 18, TypeScript strict, Tailwind CSS 4, Node.js 24,
npm. Arhitectura, Route Handlers, Docker standalone și GitHub Actions/DOCR/SSH
urmează proiectul de referință `~/CuStraini/custraini-frontend`. Proiectul model nu are ORM/auth; aici SQLite
(`node:sqlite`) și autentificarea cu scrypt/HMAC acoperă cerințele suplimentare.
Zod este folosit pentru validarea comună client/server. Nu sunt necesare Notion,
un server de DB sau un serviciu de auth extern.

## Pornire locală

Din acest director:

```bash
nvm install 24
nvm use 24
npm ci
cp .env.example .env.local
npm run admin:hash
openssl rand -hex 32
```

Completează în `.env.local` `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` cu rezultatul
comenzii interactive și `SESSION_SECRET` cu secretul aleator. Nu salva parola
în clar. Apoi:

```bash
npm run db:migrate
npm run dev
```

Deschide **http://localhost:3002**, respectiv **http://localhost:3002/admin**.
Fișierul DB este creat în `data/leads.sqlite` (ignorat de Git). Datele demo sunt
opționale, doar în development:

```bash
npm run db:seed -- --allow-demo
```

Fișele sunt etichetate DEMO, folosesc contacte intenționat neapelabile și
emailuri `.invalid`. Nu le transmite furnizorilor. Seed-ul nu se execută în
producție și nu este rulat automat.

## Variabile de mediu

| Variabilă                       | Rol                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `APP_URL`                       | Originea publică exactă, fără slash final; obligatorie la build și runtime production  |
| `DATABASE_URL`                  | SQLite `file:./data/leads.sqlite` local; `file:/app/data/leads.sqlite` în container    |
| `ADMIN_USERNAME`                | Utilizator unic admin, fără valoare implicită                                          |
| `ADMIN_PASSWORD_HASH`           | `scrypt:salt:hash`, generat cu `npm run admin:hash`                                    |
| `SESSION_SECRET`                | Minimum 32 caractere aleatorii; semnează sesiuni și pseudonimizează IP-ul              |
| `TRUST_CF_HEADERS`              | `true` numai cu acces prin Cloudflare Tunnel și origin blocat pentru acces direct      |
| `OPERATOR_NAME`                 | Identitatea juridică reală a operatorului                                              |
| `OPERATOR_ADDRESS`              | Adresa operatorului                                                                    |
| `PRIVACY_EMAIL`                 | Contact real pentru solicitările privind datele personale                              |
| `SUPPLIER_DISCLOSURE`           | Destinatarii/categoriile relevante și informațiile aferente; apare în politica publică |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Opțional, GA4; injectat la build și activat în browser numai cu acord separat          |
| `DOCR_IMAGE`                    | Imagine fără tag, de ex. `registry.digitalocean.com/NAMESPACE/merita-sau-nu`           |
| `HOST_PORT`                     | Port local al dropletului, implicit `3002`                                             |

Formularul din producție răspunde 503 până la completarea informațiilor despre
operator și destinatari. Acesta este un control de configurare, nu o validare
juridică. Politica și termenii sunt texte de lucru ce trebuie adaptate situației
reale. Verifică locația găzduirii, destinatarii, transferurile și retenția înainte
să colectezi date reale. Nu există newsletter.

## Baza de date și migrații

`db/migrations/*.sql`, în ordine lexicografică. Migrațiile aplicate sunt în
`schema_migrations`; fiecare migrație este tranzacțională. Pentru schimbări viitoare
adaugă un fișier nou, fără a modifica unul aplicat. Containerul execută migrațiile
înainte de pornire. În development rulează `npm run db:migrate` explicit.

Leadul păstrează inputul și rezultatul recalculate server-side, contactul,
consimțământul cu timestamp și versiune, UTM/referrer, scoring, status, note interne,
legătura către posibilul duplicat și date tehnice limitate. Același telefon în
ultimele 30 zile marchează duplicatul; solicitarea nouă este păstrată. Verificarea
și inserarea sunt într-o tranzacție `BEGIN IMMEDIATE`.

SQLite este potrivit aici pentru un singur container pe un droplet. Nu monta
aceeași DB într-un cluster de replici și nu o pune pe storage de rețea. Pentru
scalare multi-instance, migrează stocarea într-un serviciu DB adecvat.

## Verificări

```bash
npm test
npm run typecheck
APP_URL=http://localhost:3002 npm run build
npm start
```

Nu există un script de lint moștenit funcțional: Next 16 nu folosește vechiul
`next lint`. Verificarea TypeScript este obligatorie. Testele acoperă praguri,
warning-uri, scoring, telefon, validare, consimțământ, stocare/duplicate, filtre,
paginare, CSV, sesiuni și rate limit. Testele de stocare folosesc o DB temporară.

Pentru testele în browser vezi `tests/e2e/` și configurația Playwright. Ele pornesc
un server separat cu DB temporară și nu folosesc datele tale locale.

```bash
npx playwright install chromium
npm run test:e2e
# sau folosește Chrome deja instalat:
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

## Calculator și scoring

`lib/batteryCalculator.ts` conține formula, pragurile și avertismentele.
`capacityForNight`: sub 4 → 5; 4–8 inclusiv → 5–10; peste 8–12 inclusiv →
10–15; peste 12 → 15+ kWh. Pentru categorii folosim reprezentativ 3/6/10/15 kWh;
nu prezentăm acestea ca măsurători. Dacă utilizatorul nu știe consumul de noapte:
consum lunar / 30 × 0,45; precizie redusă. Producția PV și bugetul nu sunt folosite
pentru a inventa economii sau amortizări.

`lib/leadScoring.ts` definește punctajele și HOT ≥70, WARM ≥45, COLD <45. Scorul
este intern. Modifică modulele pure și testele aferente când schimbi regulile.

## Admin și securitate

`/admin/login` permite autentificarea; `/admin` și `/admin/leads/**` sunt protejate
în layout, iar fiecare API admin verifică separat sesiunea. Cookie HttpOnly,
SameSite Strict, Secure pentru origini HTTPS, sesiune HMAC de 8 ore. Schimbarea
`SESSION_SECRET` invalidează toate sesiunile. Schimbă secretul când rotești parola
sau revoci accesul. Adminul nu are credențiale implicite.

Dashboard: KPI-uri, leaduri recente. Lista: filtre status/județ/categorie/date/termen,
căutare nume/telefon/email, 20 pe pagină, cele mai recente primele. CSV exportă toate
rezultatele filtrate, inclusiv cele de pe celelalte pagini, cu neutralizarea
formulelor Excel. Datele calendaristice și orele afișate folosesc Europe/Bucharest.

API-uri: `POST /api/leads`, `GET /api/admin/leads`,
`GET/PATCH /api/admin/leads/[id]`, `GET /api/admin/leads/export`.
Mutațiile necesită Origin egal cu APP_URL. Validare comună Zod, cereri cu dimensiune
limitată, honeypot, câmpuri text curățate, SQL parametrizat, rate limit persistent
(5 cereri/15 min pentru leaduri, 10/15 min pentru login). Fără încredere în header-ele
CF, limiterul este comun întregului origin; pentru trafic real prin tunel setează
`TRUST_CF_HEADERS=true` doar după blocarea accesului direct la origin.

Fără date personale în logurile aplicației sau evenimente analytics. Logurile
infrastructurii și exporturile rămân în responsabilitatea operatorului. Adminul
consemnează manual transmiterea către maximum 3 furnizori; schimbarea statusului
nu trimite nimic. Notele interne sunt separate de detaliile solicitantului.

## Tracking și SEO

`lib/analytics.ts` abstractizează toate evenimentele cerute. UTM-urile și referrer
(origin only) sunt păstrate în sessionStorage. Nu persistăm contactul în browser.
Evenimentele fără GA au fallback console doar în development, fără date personale.
GA este opțional și se încarcă după acord separat pentru măsurare. Preferința de
măsurare se poate reseta din footer; formularul nu depinde de aceasta.

APP_URL generează metadata, canonical, OpenGraph, robots și sitemap. Adminul,
rezultatele și confirmările sunt noindex. Schimbarea domeniului cere rebuild și
actualizarea ENV runtime. Nu activa cache public pentru API, admin sau răspunsuri
personalizate.

## Deploy DigitalOcean

Configurația finală și toate comenzile sunt în:

- [Deploy și GitHub Actions](docs/wiki/deployment.md)
- [ENV, health, backup și recuperare](docs/wiki/operations.md)
- [Depanare](docs/wiki/troubleshooting.md)

Orice push pe main declanșează publicarea, inclusiv un commit doar cu documentație.
Aplicația folosește `/srv/merita-sau-nu`, portul loopback 3002, container și volume
separate. Registry-ul păstrează numai latest după deploy și health reușite.
OpenSSH verifică amprenta RSA a dropletului. Nu se suprascrie ENV-ul serverului.

**Rutele funcționale ale tunelului se configurează în dashboard-ul Cloudflare.**
DNS-ul către my-hello este necesar, dar trebuie adăugate și cele două Published
application routes către `http://127.0.0.1:3002`. Nu presupune că un fișier local
validat în shell reprezintă configurația efectivă a serviciului.

## Backup și restaurare DB

Backup consistent SQLite prin API-ul Node, fără copierea unui fișier WAL activ:

```bash
npm run db:backup
# pe droplet
cd /srv/merita-sau-nu
docker compose exec -T merita-sau-nu node scripts/backup.mjs
```

Backupurile sunt în `backups/` local, respectiv în volumul merita-sau-nu-backups.
Copiază-le off-droplet într-un spațiu privat, cu acces și retenție controlate.
Verifică periodic restaurarea într-un mediu separat.

Restaurare pe droplet (înlocuiește BACKUP.sqlite; salvează în prealabil starea curentă):

```bash
cd /srv/merita-sau-nu
docker compose stop merita-sau-nu
# rulează doar cu aplicația oprită; elimină WAL/SHM vechi și restaurează copia
# volumul montat în acest container temporar rămâne cel din Compose
docker compose run --rm --no-deps --entrypoint sh merita-sau-nu -c 'cp /app/backups/BACKUP.sqlite /app/data/leads.sqlite && rm -f /app/data/leads.sqlite-wal /app/data/leads.sqlite-shm'
docker compose up -d --wait
```

Nu executa `docker compose down -v`: ar șterge volumele. Nu monta directoare cu
permisiuni incompatibile cu UID 1000 (`node` din imagine). Pentru rollback de cod,
reconstruiește commitul anterior și publică-l ca `latest`; dacă schema s-a
schimbat incompatibil, restaurează și backupul de dinainte de deploy.

## Politica GDPR și retenția

`lib/privacy.ts`: textul acordului și `PRIVACY_POLICY_VERSION`. Actualizează pagina
publică și versiunea împreună la schimbări; leadurile vechi păstrează acordul exact
acceptat. Niciun checkbox nu este bifat implicit.

Politica propune maximum 180 zile de la ultima actualizare. Aplică efectiv această
retenție, inclusiv asupra CSV, backupurilor și destinatarilor. Comanda de mentenanță
are implicit dry run și necesită `--apply` pentru ștergere. Folosește-o după un
backup și verificarea obligațiilor concrete:

```bash
node --env-file-if-exists=.env.local scripts/retention.mjs
node --env-file-if-exists=.env.local scripts/retention.mjs --apply
# în producție: docker compose exec -T merita-sau-nu node scripts/retention.mjs [--apply]
```

## Stare și continuare

Lansarea din 30 octombrie 2026 este confirmată: deploy și curățare reușite,
health-uri publice 200 și lead creat de pe site vizibil în admin.

[Deciziile și verificările](docs/wiki/decisions.md) separă funcționalitățile
confirmate de ce rămâne de configurat: Analytics, per-IP rate limit, redirecționare
www, backup off-droplet și programarea retenției. Acestea nu au fost activate
implicit. Vezi [raportul de verificare](VERIFICATION.md).

Referințe pentru textele de informare: [Comisia Europeană — drepturile persoanelor](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en) și [informarea privind datele personale](https://europa.eu/youreurope/citizens/consumers/internet-telecoms/data-protection-online-privacy/).

## Production readiness și checklist

Vezi [PRE_LAUNCH_CHECKLIST.md](PRE_LAUNCH_CHECKLIST.md) și
[runbook-ul complet](docs/PRODUCTION_READINESS.md) pentru deploy, backup zilnic,
offsite, retenție și restore. Configurația incompletă produce health 503 și
refuză candidatul înainte de înlocuirea containerului curent.

În producția exclusiv Cloudflare Tunnel configurează:

```dotenv
TRUST_CF_HEADERS=true
```

Este permis **numai când originul nu este accesibil direct de pe internet**:
Compose păstrează `127.0.0.1:3002:3000`, tunelul rulează pe același host. Nu expune
portul pe 0.0.0.0 și nu adăuga un proxy public care permite ocolirea Cloudflare.
Se folosește exclusiv `cf-connecting-ip`, validat ca IP; `X-Forwarded-For` arbitrar
este ignorat. Lipsa headerului folosește fallback comun, fără a inventa o identitate.

### Cloudflare Access pentru admin (recomandat)

În Cloudflare Zero Trust → Access → Applications, configurează aplicații self-hosted
pentru ambele hostname-uri folosite, cu protecție pentru `/admin`, `/admin/*`,
`/api/admin` și `/api/admin/*`. Include rutele rădăcină, nu doar subcăile.
Permite numai identitățile admin necesare, cu MFA dacă este disponibil, fără
politică Bypass generală. Testează accesul neautentificat în browser și la API.
Login-ul aplicației rămâne al doilea strat; nu se implementează OAuth.

Nu proteja domeniul întreg: `/api/leads`, `/calculator-baterie` și `/rezultat`
rămân publice. Configurarea Access este manuală, nu activată de acest commit.
[Documentație Cloudflare](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/).

### Repository și ZIP

```bash
npm run hooks:install
npm run check:repository
npm run package
```

ZIP-ul este în `dist/merita-sau-nu-source.zip`, numai surse cunoscute de Git,
fără ENV/DB/backups/build/dependențe/rapoarte/artefacte. Python 3 și Git sunt
necesare. `.env.example` rămâne versionat; toate `.env*` sunt excluse din ZIP.
Nu loga payload-uri, căutări admin, cookie-uri sau exporturi CSV.

## Întreținerea documentației

La fiecare modificare a proiectului, actualizează acest README și documentația
Markdown relevantă (wiki, runbook, verificări sau checklist), astfel încât să
reflecte implementarea și starea verificată. Regula este păstrată și în AGENTS.md.

## Ștergere manuală leaduri — 2 noiembrie 2026

În admin, deschide detaliile unui lead și apasă **Șterge leadul**, sub butonul de
salvare. Confirmarea este obligatorie; Anulează păstrează leadul. După ștergere,
aplicația revine la listă. Leadul dispare din liste, statistici și exporturile noi.
Istoricul său este șters automat; alte leaduri duplicate sunt păstrate, fără link
către înregistrarea eliminată. Nu există undo în admin.

Endpointul DELETE /api/admin/leads/[id] necesită sesiune admin și Origin valid,
la fel ca modificarea statusului. Nu se loghează datele șterse și nu se trimit
în analytics. Nu este nevoie de migrare DB sau de o schimbare Cloudflare Access.
Backupurile și CSV-urile deja descărcate nu sunt modificate; au retenție separată.

## Registry: verificare întârziată după ștergere — 2 noiembrie 2026

Dacă buildul, deploy-ul și health public trec, dar ultima etapă spune
`Registry listing did not converge`, noua aplicație a fost deja pornită și
verificată. Scriptul nu a putut confirma lista finală de imagini în timpul permis;
nu este dovada că deploy-ul a eșuat sau că registry-ul este deja curățat.

Verificarea face acum implicit 18 citiri, la 10 secunde (maximum 170 secunde de
pauze plus durata API), în locul celor 6 citiri la 5 secunde. Logul arată dacă
latest este vizibil și dacă persistă manifeste vechi/neprevăzute. După timeout,
etapa rămâne eșuată, fără ștergeri suplimentare pe baza unei liste posibil vechi.
Protecția latest, verificarea grafului și oprirea la schimbarea tagului rămân active.

Opțiuni pentru CI/teste: REGISTRY_VERIFY_ATTEMPTS (1–30) și
REGISTRY_VERIFY_DELAY_SECONDS (0–30). Configurația invalidă este refuzată înainte
de ștergere. Dacă problema persistă, inspectează lista de manifeste și latest;
nu șterge manual imaginea curentă și nu folosi prune global.
