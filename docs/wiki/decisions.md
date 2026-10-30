# Decizii și verificări la lansare

[Înapoi la wiki](README.md)

## Decizii acceptate — 30 octombrie 2026

| Decizie                                      | Motiv / consecință                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| Repo separat de CuStrăini                    | Aplicație și ciclu de deploy independente                                   |
| Păstrarea stack-ului Next/TypeScript/Node 24 | Reutilizarea arhitecturii tehnice existente                                 |
| SQLite și migrații SQL, fără ORM             | MVP pe un singur droplet, fără serviciu DB suplimentar                      |
| Rezultat înaintea formularului               | Vizitatorul primește estimarea fără contact obligatoriu                     |
| Recalculare server-side                      | Nu se salvează ca autoritar un rezultat trimis de client                    |
| Leaduri duplicate păstrate                   | Cererea nouă nu este pierdută; legătură către cea anterioară                |
| Scoring intern simplu                        | Prioritizarea verificărilor; nu predicție de cumpărare                      |
| Operator/disclosure obligatorii în producție | Previne lansarea formularului cu acele câmpuri goale                        |
| Admin credentials în ENV                     | Fără conturi publice sau credențiale hardcoded                              |
| Domeniu canonic meritasaunu.com              | APP_URL pentru metadata și verificarea Origin                               |
| Published application routes în dashboard    | A fost configurația care a rezolvat 404 în producție                        |
| OpenSSH și pinning RSA                       | Conectare predictibilă și verificare explicită a identității serverului     |
| Doar latest în registry                      | Preferința utilizatorului; versiunile vechi nu se păstrează pentru rollback |
| Fără atestări suplimentare de build          | Manifest unic; fără metadate de provenance/SBOM generate de build           |
| Curățare doar după health public reușit      | Imaginile vechi nu sunt eliminate în urma unui deploy eșuat                 |
| Fără prune global                            | Server și registry partajate cu alte aplicații                              |
| Acord Analytics separat                      | Acordul pentru oferte nu activează marketingul sau măsurarea                |

## Dovezi de finalizare

- 47 teste unitare/integrate trecute, inclusiv curățarea registry-ului, protecția
  grafurilor, erorile 412 și actualizarea întârziată a listelor.
- TypeScript trecut; build production și 6 teste browser mobil/desktop trecute
  anterior; build/teste/typecheck trecute și în workflow-urile de producție.
- Ultimul workflow de deploy a trecut și a raportat o singură imagine latest.
- Direct pe droplet: serviciu cloudflared active/enabled, container healthy,
  homepage local/public și ambele health-uri publice HTTP 200.
- Utilizatorul a confirmat trimiterea formularului de pe domeniul real și afișarea
  leadului în admin la finalul sesiunii de lansare.
- Nu au fost trimise automat solicitări către furnizori.

## Nu sunt confirmate / nu s-au implementat în această sesiune

Acestea sunt puncte pentru lucru separat, nu presupuneri despre producție:

- `TRUST_CF_HEADERS` este încă false. Per-IP rate limit nu a fost activat.
- GA4 nu este configurat; wrapper-ul există, raportarea reală nu a fost validată.
- Ruta www funcționează; redirecționarea la domeniul canonic nu a fost confirmată.
- Backup off-droplet programat, rotație automată a backupurilor și retenție
  programată nu au fost configurate.
- Restaurarea DB în producție nu a fost executată; backupul consistent a fost
  verificat anterior într-o DB temporară.
- Nu s-a efectuat un audit juridic; completarea câmpurilor de ENV nu este unul.
- Transmiterea reală către furnizori, numărul efectiv de oferte și conversia nu
  au fost măsurate. Sunt necesare procesul comercial și destinatarii reali.
- Override-ul systemd propus pentru config explicit nu a fost creat și nu este
  necesar pentru configurația finală funcțională.
- Nu a fost modificată politica IT a VPN-ului corporate; cauza regulii concrete
  de resetare nu a fost inspectată.

## Memorie și confidențialitate

Memoria durabilă este în acest wiki și în AGENTS.md, versionate împreună cu codul.
Nu presupune existența unei memorii globale a asistentului sau accesul unei sesiuni
viitoare la conversație. Nu salva secretele din conversație, contactele leadurilor,
identificatori de cereri reale sau capturile admin în documentație.
