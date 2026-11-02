# Operațiuni și recuperare

[Înapoi la wiki](README.md)

## Conectare

De pe Mac:

```bash
ssh root@134.122.72.18
```

Cu identitatea dedicată deploy-ului:

```bash
ssh -i ~/.ssh/merita-sau-nu-deploy -o IdentitiesOnly=yes root@134.122.72.18
```

Pe droplet:

```bash
cd /srv/merita-sau-nu
```

## Verificări rapide pe droplet

```bash
systemctl is-active cloudflared
systemctl is-enabled cloudflared
docker compose ps
curl -i --max-time 10 http://127.0.0.1:3002/api/health
curl -i --max-time 20 https://meritasaunu.com/api/health
curl -i --max-time 20 https://www.meritasaunu.com/api/health
```

Health verifică și accesul la tabela de leaduri. Așteptat: HTTP 200 și `{"ok":true}`.
Pentru pagina principală, health-ul singur nu este suficient:

```bash
curl -sS -o /dev/null -w 'Homepage: %{http_code}\n' --max-time 20 https://meritasaunu.com/
```

Inspectarea logurilor (citește local; nu publica eventuale informații sensibile):

```bash
docker compose logs --tail=100 merita-sau-nu
journalctl -u cloudflared --since '10 minutes ago' --no-pager
```

## Configurație runtime

`/srv/merita-sau-nu/.env` este configurat pe server, cu permisiuni 600. Fișierul
local pentru development este `.env.local`. Niciunul nu se comite.

Valori publice de producție:

```dotenv
APP_URL=https://meritasaunu.com
DATABASE_URL=file:/app/data/leads.sqlite
DOCR_IMAGE=registry.digitalocean.com/kiduu-test/merita-sau-nu
HOST_PORT=3002
```

`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` și `SESSION_SECRET` au valori reale
configurate separat; wiki-ul nu le păstrează. Hashul începe cu `scrypt:` și poate
fi generat pe Mac; nu trebuie generat obligatoriu pe droplet. Parola în clar nu
se pune în ENV. Rotirea SESSION_SECRET invalidează sesiunile admin existente.

Aceste 4 câmpuri sunt obligatorii pentru cereri de ofertă în producție:

- OPERATOR_NAME
- OPERATOR_ADDRESS
- PRIVACY_EMAIL
- SUPPLIER_DISCLOSURE

La lansare au fost completate; utilizatorul a confirmat apoi crearea unui lead
în admin. Valorile reale sunt publicate de aplicație în politica de confidențialitate,
nu copiate aici. Nu completa identități/adrese sau parteneri fictivi.

Stare verificată: **TRUST_CF_HEADERS=false**, **GA neconfigurat**. Cu false,
limitarea cererilor folosește un bucket comun pentru origin: 5 cereri/15 minute,
respectiv 10 încercări login/15 minute. Activarea per-IP este o schimbare separată:
verifică întâi că numai Cloudflare ajunge la origin și că header-ul CF este de încredere.
Portul 3002 este deja legat de loopback, dar în această sesiune variabila nu a fost activată.

Pentru schimbarea ENV:

```bash
nano /srv/merita-sau-nu/.env
chmod 600 /srv/merita-sau-nu/.env
docker compose up -d --force-recreate --wait
```

Recreate este necesar pentru a prelua ENV nou. `docker compose restart` nu
reconfigurează mediul. Nu este necesar rebuild pentru câmpurile runtime; APP_URL
și variabilele NEXT_PUBLIC folosite în build cer și rebuild pentru metadata/client.

## Publicare obișnuită

Pe Mac, din checkout:

```bash
cd ~/merita-sau-nu
git status --short
npm test
npm run typecheck
```

Comite doar fișierele schimbării și fă push pe main. Orice push, inclusiv unul
doar cu documentație, declanșează workflow-ul de producție. În GitHub → Actions,
urmărește execuția commitului nou. Re-run al unei execuții vechi folosește codul vechi.

Pentru o relansare manuală a imaginii latest deja publicate:

```bash
cd /srv/merita-sau-nu
sh deploy/deploy.sh
```

Aceasta face backup/pull/recreate local. Curățarea DOCR este o etapă distinctă
în GitHub Actions și nu este executată de deploy.sh de pe droplet.

## Backup DB

DB-ul este în volumul `merita-sau-nu-data`; nu depinde de imaginea containerului.
La deploy-urile ulterioare, scriptul face backup înainte de înlocuirea containerului
care rulează. Prima publicare nu avea o DB anterioară de salvat.

Backup manual consistent, prin API-ul SQLite, nu copierea DB-ului WAL activ:

```bash
cd /srv/merita-sau-nu
docker compose exec -T merita-sau-nu node scripts/backup.mjs
docker compose exec -T merita-sau-nu ls -lh /app/backups
```

Pentru descărcare privată, înlocuiește NUME_BACKUP.sqlite cu numele creat:

```bash
# Pe droplet: copiază o copie consistentă în directorul privat de transfer.
install -d -m 700 /root/merita-backup-transfer
docker cp merita-sau-nu:/app/backups/NUME_BACKUP.sqlite /root/merita-backup-transfer/
chmod 600 /root/merita-backup-transfer/NUME_BACKUP.sqlite
```

```bash
# Pe Mac: director local privat, exclus din repository.
mkdir -p ~/merita-backups
chmod 700 ~/merita-backups
scp root@134.122.72.18:/root/merita-backup-transfer/NUME_BACKUP.sqlite ~/merita-backups/
chmod 600 ~/merita-backups/NUME_BACKUP.sqlite
```

Nu a fost configurat un job periodic de backup off-droplet. Exportul CSV nu este
un backup complet: nu restaurează toate tabelele, istoricul și rate limit-ul.

## Restaurare DB

Necesită o copie existentă în `/app/backups` și o fereastră de mentenanță.
Fă și un backup al stării curente. Cu aplicația oprită, înlocuiește fișierul și
îndepărtează WAL/SHM vechi înainte de repornire:

```bash
cd /srv/merita-sau-nu
docker compose stop merita-sau-nu
docker compose run --rm --no-deps --entrypoint sh merita-sau-nu -c 'cp /app/backups/NUME_BACKUP.sqlite /app/data/leads.sqlite && rm -f /app/data/leads.sqlite-wal /app/data/leads.sqlite-shm'
docker compose up -d --wait
curl --fail --max-time 10 http://127.0.0.1:3002/api/health
```

Nu executa `docker compose down -v`: ar elimina datele persistente. Restaurarea
în producție și recuperarea off-droplet nu au fost executate în timpul lansării;
verifică periodic procedura într-un mediu separat.

## Rollback și migrații

Registry-ul păstrează doar latest. Nu presupune că un tag SHA vechi mai există.
Pentru rollback de cod, pregătește un commit de revenire, rulează testele și publică-l
prin workflow-ul curent. Pentru schimbări incompatibile de schemă, planifică și
restaurarea backupului de dinainte de deploy; rollback-ul imaginii nu inversează SQL.

Migrațiile sunt în `db/migrations/`, aplicate tranzacțional și înregistrate în
schema_migrations. Adaugă migrații noi; nu modifica una aplicată în producție.
SQLite este configurat pentru un singur container, nu pentru replici pe storage partajat.

## Retenție și administrare leaduri

Retenția propusă este 180 zile de la updatedAt. Comanda implicită este dry run:

```bash
docker compose exec -T merita-sau-nu node scripts/retention.mjs
```

Numai pentru aplicarea unei ștergeri revizuite și autorizate:

```bash
docker compose exec -T merita-sau-nu node scripts/retention.mjs --apply
```

Jobul nu este programat automat. Exporturile, backupurile și datele trimise
furnizorilor au nevoie de retenție separată. Acordul pentru oferte nu este newsletter.

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
