# Verificare — 30 octombrie 2026

Mediu: Node.js 24.22.0, Chrome local, macOS.

- `npm test`: **47/47 trecute**. Calculator, warning-uri, scoring, telefon,
  validare, consimțământ, stocare, duplicate, filtre, paginare, CSV, rate limit,
  Origin, sesiuni și date calendaristice inclusiv schimbarea orei în România.
- `npm run typecheck`: trecut.
- `APP_URL=http://localhost:3002 npm run build`: build production trecut.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`: **6/6 trecute**.
  Fluxul complet pe mobil și desktop: landing cu UTM → wizard cu Back/Next →
  rezultat înainte de contact → consimțământ obligatoriu → lead în DB → admin
  protejat → date calculator/UTM → modificare status/note → CSV filtrat → logout.
  API-urile sunt verificate separat pentru acces neautorizat, Origin, validare,
  duplicate, consimțământ, honeypot și limitarea cererilor.
- Capturi QA în `artifacts/`: landing și rezultat pentru mobil/desktop.
- Migrații și seed rulate de două ori într-o DB temporară: fără dublare.
- Seed: toate cele 3 contacte salvate sunt intenționat neapelabile.
- Backup SQLite consistent: deschis separat și verificat cu cele 3 fișe demo.
- Retenție: dry run păstrează datele; `--apply` elimină doar fișa expirată.
- `sh -n docker-entrypoint.sh` și `sh -n deploy/deploy.sh`: trecute.
- `npm run format:check`: verificare Prettier pentru întregul proiect.

## Verificarea producției

Ulterior verificărilor locale, în aceeași zi:

- GitHub Actions: build, teste, typecheck, deploy, health public și curățare trecute.
- Registry DO: o singură imagine latest, confirmată în dashboard și prin logul
  `Cleanup verified: 1 current manifest(s) remain.`
- Direct pe droplet: cloudflared active/enabled, container healthy, homepage local
  și public 200, health principal și www 200.
- Utilizatorul a confirmat un lead creat prin formularul site-ului și vizibil în admin.
- Cele 4 variabile operator/disclosure sunt configurate. Valorile nu sunt documentate.

## Limite și separarea verificărilor

Docker nu este instalat pe Mac; buildul imaginii și rularea Compose au fost
confirmate prin workflow și producție. Cele 6 teste browser sunt verificările
locale anterioare, nu o suită browser rerulată pe DB-ul real. Nu au fost trimise
automat solicitări către furnizori. Testele de stocare folosesc DB-uri temporare.
Analytics este neconfigurat. Nu s-a testat restaurarea DB-ului de producție.
CuStrăini a fost referință; repository-ul său nu a fost modificat de implementare.

Vezi [wiki](docs/wiki/README.md) pentru configurația finală și limitele operaționale.

Verificare suplimentară: puterea PV lipsă blochează pasul 1 chiar dacă următorii
pași nu sunt completați. Progresul salvat incomplet revine la primul pas invalid,
păstrează consumul introdus și permite finalizarea după corectare. Testat pe mobil
și desktop.

## Production-readiness pass — 31 octombrie 2026

- npm ci: trecut, registry public; audit după actualizare: 0 vulnerabilități.
- Next 16.4.3, Zod 4.6.7, dependențe tranzitive compatibile actualizate.
- npm test: 56/56; include validarea config/health, separarea cheilor CF, rollback
  tranzacție, restart în proces nou, migrații repetate și backup consistent.
- npm run typecheck, npm run format, npm run build: trecute.
- Playwright Chrome: 8/8, mobil/desktop, HTTPS local cu certificat temporar; DB temporară.
  GA ID sintetic și stub de script, fără telemetrie trimisă unui cont real.
- Include căutare admin fără q în URL, CSV, logout și consent analytics.
- Teste arhivare și backup zilnic cu upload reușit/eșuat, fără credentials/provider real.
- Regulile gitignore acoperă toate căile cerute; .env.example este permis.

Aceste verificări sunt locale; noua versiune nu a fost publicată. Nu s-a schimbat
ENV de producție, nu s-a instalat cron, Access sau storage extern. Docker nu este
instalat local: candidate preflight/Compose trebuie verificate la următorul deploy.
React 18 rămâne păstrat; Next 16 avertizează că suportul va fi eliminat în Next 17.
