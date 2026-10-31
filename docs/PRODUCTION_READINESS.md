# Production readiness — 31 octombrie 2026

Acest pass păstrează MVP-ul și SQLite. Nu aplică ENV, timer, Access sau restore
pe producție. Starea istorică din wiki (TRUST_CF_HEADERS=false) trebuie corectată
manual înaintea deploy-ului acestei versiuni.

## Configurație și preflight

`validateProductionConfig()` este implementată în `scripts/production-config.mjs`,
reexportată din `lib/productionConfig.ts`. Este folosită de startup, health și lead API.
Verifică APP_URL HTTPS fără credențiale/query/fragment, SESSION_SECRET de minimum
32 caractere, ADMIN_USERNAME, formatul scrypt al ADMIN_PASSWORD_HASH și câmpurile
OPERATOR_NAME, OPERATOR_ADDRESS, PRIVACY_EMAIL (email valid), SUPPLIER_DISCLOSURE.
În producția acestui proiect verifică și TRUST_CF_HEADERS=true.

Nu poate verifica dacă identitatea legală este reală sau dacă un secret a fost
folosit anterior. Administratorul trebuie să facă aceste verificări și rotația.

Health: `{ok, configured, database, configurationIssues}`. Issues conține numai
nume de câmpuri; nicio valoare ENV, eroare SQL sau înregistrare din DB. Status 503
când DB sau configurația nu sunt bune, altfel 200. Formularul rămâne blocat la
configurație incompletă. Startup-ul eșuează înainte de migrare; deploy-ul verifică
noua imagine cu ENV runtime înainte de înlocuirea containerului existent.

## Deploy exact

Înainte de push, pe droplet:

```bash
ssh root@134.122.72.18
cd /srv/merita-sau-nu
nano .env
chmod 600 .env
```

Configurează valorile reale; nu le afișa în chat/loguri. APP_URL trebuie să fie
`https://meritasaunu.com`, TRUST_CF_HEADERS=true, și credențialele trebuie rotite.
Generează hashul interactiv cu `npm run admin:hash` pe Mac. Generează secret nou
cu `openssl rand -hex 32`; copiază-l privat în ENV. Nicio parolă în istoricul shell.
Nu schimba volumele, numele proiectului sau portul loopback.

Pe Mac, din checkout, după review și QA:

```bash
cd ~/merita-sau-nu
git status --short
git add .gitignore .dockerignore .prettierignore .githooks .github deploy Dockerfile docker-entrypoint.sh next-env.d.ts package.json package-lock.json lib app components scripts tests playwright.config.ts README.md PRE_LAUNCH_CHECKLIST.md docs AGENTS.md VERIFICATION.md FILES.md
git diff --cached --check
git commit -m "Harden production configuration, privacy and backup operations"
git push origin main
```

Push pornește GitHub Actions: teste, build, candidat validat, backup pre-deploy,
recreate healthy, health public și curățare DOCR numai după succes. Nu face push
cu ENV de producție incomplet: candidatul va fi refuzat, aplicația veche rămâne.
După workflow:

```bash
ssh root@134.122.72.18
cd /srv/merita-sau-nu
docker compose ps
curl --fail --max-time 20 https://meritasaunu.com/api/health
curl --fail --max-time 20 https://www.meritasaunu.com/api/health
```

Relansarea aceleiași imagini deja publicate: `sh deploy/deploy.sh`. Codul local
nu ajunge în imagine prin simplu git pull pe droplet; buildul este în Actions.

## Backup zilnic și offsite

Script host: `scripts/backup-production.sh`, copiat pe droplet de workflow.
Necesită Bash, Docker Compose, Python 3 și flock (util-linux). Lockul previne
suprapunerea jobului zilnic. Backupul folosește API-ul SQLite online și quick_check;
copia privată locală primește mod 600. Nu copia direct DB-ul WAL activ.

Creează pe droplet configurația privată:

```bash
install -m 600 /dev/null /etc/merita-backup.env
nano /etc/merita-backup.env
```

Conținut orientativ, de adaptat storage-ului ales:

```bash
BACKUP_RETENTION_DAYS=30
BACKUP_EXPORT_DIR=/var/backups/merita-sau-nu
BACKUP_UPLOAD_COMMAND='/usr/local/sbin/upload-merita-backup "$BACKUP_FILE"'
```

`upload-merita-backup` este integrarea administratorului, nu un provider impus.
Primește fișierul consistent prin argument sau variabila BACKUP_FILE; trebuie
să folosească storage din alt failure domain, criptare în tranzit/la stocare,
credențiale cu acces minim dintr-un fișier privat și să returneze 0 numai după
confirmarea uploadului. Scriptul nu printează comanda/erorile providerului.
Configurația este cod shell de încredere: root-owned, fără acces de scriere altora.
Nu pune credentials sau configurația reală în GitHub.

Testează întâi manual:

```bash
cd /srv/merita-sau-nu
bash scripts/backup-production.sh
```

Când uploadul lipsește/eșuează: exit nenul, copia locală păstrată, retenția nu rulează.
Succesul comenzii de upload nu demonstrează singur că restaurarea externă funcționează.
Recuperează o copie din storage și verifică restore într-un mediu izolat.

După upload și restore validate, instalează cron (root, ora sistemului):

```bash
crontab -e
```

Adaugă:

```cron
15 2 * * * cd /srv/merita-sau-nu && /bin/bash scripts/backup-production.sh >> /var/log/merita-backup.log 2>&1
```

Monitorizează exit code / lipsa unui backup zilnic prin sistemul tău de alertare;
cron cu redirecționare nu alertează singur. Configurează rotația logului.
Retenția locală este 30 zile implicit, aplicată doar după upload reușit și numai
fișierelor `leads-*.sqlite`. Afectează și copiile pre-deploy mai vechi din volum.
Dacă offsite nu funcționează, copiile se acumulează: monitorizează discul.
Configurează separat lifecycle/retention externă (de exemplu 30 zile), ștergerea
la expirare și accesul la copii, conform politicii reale de date.
Backup pe același droplet NU este disaster recovery.

Backup manual doar în volum:

```bash
cd /srv/merita-sau-nu
docker compose exec -T merita-sau-nu node scripts/backup.mjs
docker compose exec -T merita-sau-nu ls -lh /app/backups
```

## Restore exact

Înlocuiește NUME_BACKUP.sqlite. Mai întâi recuperează copia din storage extern în
`/root/merita-restore/` (director 700, fișier 600). Nu publica copia în repository.
Fă backup al stării curente și verifică integritatea copiei înainte de mentenanță.
Comanda de copiere în volum se execută ca node prin Compose; nu schimbă proprietarul DB.

```bash
cd /srv/merita-sau-nu
docker compose exec -T merita-sau-nu node scripts/backup.mjs
docker compose exec -T merita-sau-nu sh -c 'umask 077; cat > /app/backups/restore.sqlite' < /root/merita-restore/NUME_BACKUP.sqlite
docker compose exec -T merita-sau-nu node -e 'const {DatabaseSync}=require("node:sqlite");const db=new DatabaseSync("/app/backups/restore.sqlite",{readOnly:true});if(db.prepare("PRAGMA integrity_check").get().integrity_check!=="ok")process.exit(1);db.close();'
docker compose stop merita-sau-nu
docker compose run --rm --no-deps --entrypoint sh merita-sau-nu -c 'cp /app/backups/restore.sqlite /app/data/leads.sqlite && chmod 600 /app/data/leads.sqlite && rm -f /app/data/leads.sqlite-wal /app/data/leads.sqlite-shm'
docker compose up -d --wait --wait-timeout 120
curl --fail --max-time 10 http://127.0.0.1:3002/api/health
```

Verifică apoi adminul/leadurile așteptate, istoricul și o cerere de test nouă.
`restore.sqlite` nu intră în retenția automată: șterge copia de lucru după verificare.
Nu folosi `docker compose down -v`. Restaurarea elimină modificările apărute după
backup; coordonează fereastra de mentenanță. Migrațiile rămân versionate, idempotente.
Nu există rollback automat de schemă; numai latest este păstrată în registry.

## Confidențialitate și verificări

WAL, busy_timeout=5000, foreign_keys=ON și BEGIN IMMEDIATE/COMMIT/ROLLBACK la createLead
sunt păstrate. Testul de restart creează lead într-un proces, redeschide DB într-altul,
rerulează migrațiile și verifică o copie consistentă deschisă separat.

Logul de eroare lead este fix, fără payload/telefon/email. Hash generatorul afișează
intenționat hashul pentru configurare: nu copia outputul în tichete. Scripturile de
backup afișează nume de fișiere, nu rânduri DB. Nu activa request/body/header logging
la proxy. CSV conține PII necesar și trebuie stocat privat.

Căutarea admin folosește POST + cookie HttpOnly/SameSite Strict de 15 minute;
termenul nu se propagă în linkuri de paginare/export sau query string. ID-ul opac
al leadului rămâne în URL-ul detaliilor. Cookie-ul de căutare nu se folosește ca
identitate sau autorizare. Autentificarea este verificată separat.

Analytics: numai evenimente cunoscute și step numeric 1–5; fără debug payload,
query string, referrer, telefon, email, ID de lead sau texte libere. Consent este
verificat și în funcția de tracking; adminul dezactivează tracking-ul. În GA4,
dezactivează Enhanced Measurement (mai ales form interactions), Google Signals
și colectarea automată/User-provided data. Configurarea din dashboard trebuie
verificată înainte de a seta NEXT_PUBLIC_GA_MEASUREMENT_ID și a face rebuild.

## Arhivă sursă

`npm run package` folosește Git și Python 3 standard library. Include numai fișiere
cunoscute de Git, versiunea din working tree. Adaugă fișierele noi revizuite în
index înainte de ambalare. Exclude toate .env\*, inclusiv .env.example din ZIP;
.env.example rămâne în repo. Exclude DB-uri, sidecars, directoare generate, chei și
symlink-uri. O scanare de markeri de chei/hashuri/tokenuri cunoscute oprește arhivarea;
nu înlocuiește review-ul pentru secrete arbitrare introduse în cod.
ZIP privat: `dist/merita-sau-nu-source.zip` (600), ignorat de Git și Docker.
Este arhivă source pentru review/build, nu imagine Docker sau backup DB.

.gitignore protejează adăugarea obișnuită; hookul local și check:repository din CI
refuză căile interzise deja urmărite sau forțate în index. Administratorul poate
ocoli un hook cu --no-verify; protejează main cu required checks și secret scanning.
