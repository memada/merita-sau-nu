# Verificare — 30 octombrie 2026

Mediu: Node.js 24.22.0, Chrome local, macOS.

- `npm test`: **30/30 trecute**. Calculator, warning-uri, scoring, telefon,
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

## Limite de verificare

Docker nu este instalat în mediul local; imaginea și Compose nu au fost pornite.
Nu au fost accesate sau modificate dropletul, DNS-ul sau tunelul live. Workflow-ul
GitHub Actions nu a fost executat într-un repository remote. Sunt necesare
repo/secrets/ENV, domeniu, date operator și destinatari pentru lansare.
Analytics este opțional; testele de flux au rulat cu GA dezactivat.
Nu s-au trimis cereri către furnizori. Testele folosesc baze temporare curățate.
Proiectul model a fost doar citit; modificările sale preexistente au fost păstrate.

Verificare suplimentară: puterea PV lipsă blochează pasul 1 chiar dacă următorii
pași nu sunt completați. Progresul salvat incomplet revine la primul pas invalid,
păstrează consumul introdus și permite finalizarea după corectare. Testat pe mobil
și desktop.
