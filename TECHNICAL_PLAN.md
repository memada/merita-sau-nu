# Merită sau Nu — plan tehnic

## Referința inspectată înainte de implementare

`../custraini-frontend`: Next.js 16 App Router, React 18, TypeScript strict,
Node 24, npm, Tailwind 4, module în `lib`, Route Handlers în `app/api`.
Next produce output `standalone`. Docker multi-stage pornește `server.js` pe 3000. GitHub Actions construiește pe main, publică în DOCR, face deploy prin SSH
și Docker Compose în `/srv/custraini`, cu port host 3001 și restart unless-stopped.
Notițele indică Cloudflare Tunnel `my-hello`; configurația live nu este în repo.
Nu există ORM, DB, autentificare sau scheme de validare partajate.
Nu se modifică proiectul model sau infrastructura sa.

## Implementare

1. Proiect separat `merita-sau-nu`, același framework și convenții.
2. SQLite prin `node:sqlite`, migrații SQL versionate, volum `/app/data`.
   Alegere pentru un singur proces/droplet MVP, fără serviciu DB suplimentar.
3. Landing responsive, wizard cu 5 pași, rezultat înainte de contact.
4. Calculator și scoring în module pure; Zod pentru validare comună.
5. Leaduri, consimțământ versionat, atribuire UTM, duplicate în tranzacție.
6. Admin cu scrypt, sesiune HMAC cu expirare, cookie HttpOnly/SameSite,
   verificare Origin pentru mutații și limitare persistentă a cererilor.
7. Dashboard, filtre SQL parametrizate, paginare, CSV protejat de formule,
   note interne și istoric status.
8. Analytics GA opțional numai după acord separat pentru măsurare;
   wrapper fără date de contact și fallback în development.
9. SEO construit din APP_URL, pagini legale configurabile înainte de lansare.
10. Teste unitare/integrate, typecheck, build și verificări HTTP.
11. Docker/Compose distinct, host 127.0.0.1:3002, registry separat,
    deploy workflow și exemple adiționale Cloudflare Tunnel.

## Limite asumate

Nu există promisiuni de economii, calcule de dimensionare electrică sau
transmitere automată către furnizori. Rezultatele sunt orientative.
Publicarea pe droplet necesită configurarea repo-ului, secretelor și domeniului.
Identitatea operatorului, contactul, retenția și furnizorii trebuie completate
și verificate înainte de lansarea colectării datelor reale.
