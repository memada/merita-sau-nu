# Merită sau Nu

MVP independent pentru proprietari din România: landing → calculator baterie
fotovoltaică → estimare orientativă → solicitare de până la 3 oferte → verificare
manuală în admin. Nu conține marketplace, plăți, conturi pentru instalatori sau
trimitere automată către furnizori.

## Stack și referință

Next.js 16 App Router, React 18, TypeScript strict, Tailwind CSS 4, Node.js 24,
npm. Arhitectura, Route Handlers, Docker standalone și GitHub Actions/DOCR/SSH
urmează `../custraini-frontend`. Proiectul model nu are ORM/auth; aici SQLite
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

## Deploy DigitalOcean — același model ca referința

Nu se modifică `/srv/custraini`, portul 3001 sau configurația aplicației existente.
Aplicația nouă folosește `/srv/merita-sau-nu`, container separat, port host 3002
legat doar de loopback, imagine proprie și volume proprii.

### 1. Repository și CI

Creează un repository GitHub nou din conținutul acestui director; workflow-ul
presupune că `package.json` și Dockerfile sunt la rădăcina repository-ului.

GitHub Actions secrets:

- `DOCR_ACCESS_TOKEN`, `DOCR_USERNAME`, `DOCR_REGISTRY`
- `DROPLET_IP`, `DROPLET_USER`, `DROPLET_SSH_KEY`
- `DROPLET_HOST_FINGERPRINT` — amprenta SHA256 SSH verificată prin consola DO

Repository variables:

- `DOCR_IMAGE=registry.digitalocean.com/NAMESPACE/merita-sau-nu`
- `APP_URL=https://DOMENIU_NOU`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — opțional

Registry-ul din referință este privat. Folosește token cu accesul necesar și
cheie dedicată. `DROPLET_USER` trebuie să poată scrie în `/srv/merita-sau-nu` și
rula Docker. Grupul docker conferă privilegii mari asupra serverului.

### 2. Pregătire droplet (o singură dată)

Folosește Docker Engine și pluginul Compose deja folosite de aplicația model.
Verifică portul înainte de alegere:

```bash
ssh UTILIZATOR@IP_DROPLET
sudo ss -ltnp | grep ':3002' || true
sudo mkdir -p /srv/merita-sau-nu/deploy
sudo chown -R UTILIZATOR:UTILIZATOR /srv/merita-sau-nu
```

De pe calculator, din directorul proiectului:

```bash
scp docker-compose.yml UTILIZATOR@IP_DROPLET:/srv/merita-sau-nu/
scp deploy/deploy.sh UTILIZATOR@IP_DROPLET:/srv/merita-sau-nu/deploy/
scp .env.example UTILIZATOR@IP_DROPLET:/srv/merita-sau-nu/.env
```

Pe droplet, editează fișierul fără a-l comite:

```bash
cd /srv/merita-sau-nu
chmod 600 .env
nano .env
```

Setează APP_URL=https://DOMENIU_NOU, DOCR_IMAGE, HOST_PORT=3002,
DATABASE_URL=file:/app/data/leads.sqlite, credențialele admin și SESSION_SECRET.
Completează datele operatorului și furnizorii. Cu tunelul host și loopback-only,
setează TRUST_CF_HEADERS=true după verificarea regulilor de acces. Pentru un
hash scrypt ce conține caractere speciale, folosește ghilimele simple în `.env`.
CI nu suprascrie `.env`.

### 3. Cloudflare Tunnel și domeniu

Notițele modelului indică `my-hello`, dar configurația live nu este în repo.
Mai întâi identifică pe server modul de gestionare și fișierul real:

```bash
sudo systemctl status cloudflared
sudo systemctl cat cloudflared
cloudflared tunnel list
```

Nu afișa sau copia tokenul/credențialele serviciului în chat sau loguri.
Confirmă că domeniul nou este activ în contul Cloudflare și că ai drepturile
necesare. Pentru tunel local, adaugă regulile din
`deploy/cloudflared.ingress.example.yml` în secțiunea `ingress` existentă, înainte
de catch-all, păstrând toate regulile vechi, UUID-ul și credentials-file.
Înlocuiește NEW_DOMAIN cu domeniul tău și 3002 cu HOST_PORT. Pe server:

```bash
cloudflared tunnel route dns my-hello DOMENIU_NOU
cloudflared tunnel route dns my-hello www.DOMENIU_NOU
sudo cloudflared tunnel --config /CALEA/CONFIG_EXISTENT.yml ingress validate
sudo systemctl restart cloudflared
```

Înlocuiește `my-hello` dacă tunelul real are alt nume. Comenzile de DNS necesită
certificat de administrare autorizat pentru zona nouă; dacă lipsește, folosește
un login autorizat fără să ștergi credentialele existente, sau configurează DNS
prin dashboard. Pentru tunel gestionat din dashboard, adaugă în tunelul existent
Published application routes pentru domeniu și www cu serviciu
`http://localhost:3002`; nu edita un fișier local ignorat de acel mod de gestionare.
Configurarea locală presupune cloudflared ca serviciu pe host. Dacă rulează în
Docker, localhost desemnează containerul cloudflared: configurează o rețea comună
și adresa serviciului doar după inspectarea configurației reale.

Cloudflare termină HTTPS la edge, iar tunelul ajunge la HTTP local; nu este necesar
un Nginx nou pentru această topologie. Păstrează originul inaccesibil public pe 3002. Configurează redirecționarea www → domeniul din APP_URL în Cloudflare;
folosește domeniul canonic pentru formular/admin deoarece mutațiile verifică Origin.
Repornește tunelul într-o fereastră potrivită: regulile sunt partajate cu celelalte
aplicații. Nu reinstala sau înlocui serviciul existent.

Documentație: https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/configuration-file/

### 4. Publicare

După configurarea domeniului, ENV și secretelor:

```bash
git init -b main
git add .
git commit -m "Build Merita sau Nu MVP"
git remote add origin URL_REPOSITORY_NOU
git push -u origin main
```

Workflow-ul rulează teste + typecheck, construiește imaginea, o publică în DOCR cu
`latest`, copiază numai fișierele deploy și execută pe droplet backup,
`docker compose pull`, `docker compose up -d --force-recreate --wait`. După ce noul
container devine healthy, elimină local imaginea înlocuită dacă nu este referită
și de alt container (fără force sau prune global). Verifică domeniul public
`/api/health`, apoi șterge manifestele vechi exclusiv din repository-ul
`merita-sau-nu`, păstrând digestul etichetat `latest`. Dacă deploy-ul sau verificarea
domeniului eșuează, curățarea registry-ului nu rulează. Dacă `latest` lipsește sau
se schimbă în timpul curățării, scriptul oprește ștergerea. Tokenul DO trebuie să
permită și ștergerea manifestelor. Registry-ul CuStrăini rămâne neatins.
Nu se mai păstrează versiuni istorice pentru rollback în registry.


Pentru build/deploy manual, setează valorile proprii în shell, apoi:

```bash
# local, după docker login registry.digitalocean.com
export DOCR_IMAGE=registry.digitalocean.com/NAMESPACE/merita-sau-nu
export APP_URL=https://DOMENIU_NOU
docker build --platform linux/amd64 --build-arg APP_URL="$APP_URL" -t "$DOCR_IMAGE:latest" .
docker push "$DOCR_IMAGE:latest"
# droplet, după login în același registry
sh /srv/merita-sau-nu/deploy/deploy.sh
curl --fail http://127.0.0.1:3002/api/health
curl --fail https://DOMENIU_NOU/api/health
```

Platforma exemplului este amd64, ca dropletul/runnerul modelului; verific-o cu
`uname -m` înainte de build manual. Docker/Compose trebuie testate pe server;
în mediul de implementare Docker poate să nu fie instalat.

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

## Pași manuali înainte de lansare

1. Creează repo-ul/DOCR și configurează CI secrets/variables.
2. Verifică resursele dropletului și portul, configurează ENV, credențialele și backupurile.
3. Configurează domeniul și regulile suplimentare ale tunelului existent.
4. Completează/verifică identitatea operatorului, destinatarii și textele legale.
5. Stabilește procesul manual de verificare/transmitere către maximum 3 furnizori,
   cererile de ștergere și retenția efectivă.
6. Rulează deploy-ul și verifică pe domeniul real calculator, formular, admin și CSV.
7. Configurează GA numai dacă este dorit și verifică acordul separat de măsurare.

Referințe pentru textele de informare: [Comisia Europeană — drepturile persoanelor](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en) și [informarea privind datele personale](https://europa.eu/youreurope/citizens/consumers/internet-telecoms/data-protection-online-privacy/).
