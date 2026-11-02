# Depanare — incidente întâlnite la lansare

[Înapoi la wiki](README.md)

## Începe cu simptomul și dovezile

| Simptom                                                 | Prima verificare                                              |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| Site resetat doar pe Mac                                | Telefon pe date mobile, apoi curl public de pe droplet        |
| 404 public, dar health local 200                        | Published application routes în tunel, nu doar DNS            |
| 502                                                     | Serviciul țintă, portul și conexiunea cloudflared → aplicație |
| Formular: „Cererile de ofertă nu sunt încă disponibile” | Cele patru variabile de operator/disclosure în container      |
| Formular/admin pe www: Origin nepermis                  | Folosește originea canonică fără www                          |
| Workflow: npm E401                                      | Hosturile resolved din lockfile și registry-ul npm            |
| Workflow: fingerprint mismatch                          | Secretul RSA, identitatea hostului și configurația OpenSSH    |
| Cleanup: 412                                            | Manifest vechi referit de un index vechi                      |
| Cleanup roșu, registry deja cu 1 imagine                | Actualizarea întârziată a listei de manifeste                 |

## 1. npm ci: E401 / Incorrect or missing password

Lockfile-ul local conținea 138 adrese spre registry-ul privat SAP
`common.repositories.cloud.sap`. Runnerul GitHub nu avea acces.

Corecția a păstrat versiunile și hashurile de integritate și a înlocuit numai
adresele resolved cu registry-ul public. `.npmrc` fixează configurația proiectului:

```ini
registry=https://registry.npmjs.org/
```

O instalare curată, fără configurația npm privată a utilizatorului, a reușit.
Nu adăuga credențiale corporate în acest repository pentru pachete publice.
Nu schimba parola admin sau tokenul DO pentru a repara un E401 npm.

## 2. SSH host key fingerprint mismatch

Autentificarea cu cheia dedicată a reușit de pe Mac, dar acțiunile appleboy au
respins amprenta. Schimbarea succesivă ED25519/RSA în secret nu a rezolvat cazul.

Workflow-ul final folosește OpenSSH nativ: ssh-keyscan pentru RSA, verificarea
SHA256 față de secretul confirmat pe droplet, known_hosts și StrictHostKeyChecking=yes.
Algoritmi host: rsa-sha2-512 și rsa-sha2-256. Nu se folosește ocolirea verificării.

Amprenta serverului nu este cheia privată a deploy-ului. La rotirea host key,
verifică noua amprentă prin consola/accesele de încredere ale dropletului înainte
să actualizezi secretul. Vezi [deploy](deployment.md).

## 3. 404 după DNS și restart cloudflared

Site-ul era healthy pe `127.0.0.1:3002`, DNS indica my-hello, dar publicul primea 404.
Fișierul `/root/.cloudflared/config.yml` valida și selecta regula corectă în CLI;
acest lucru nu demonstra că regulile efective ale tunelului se actualizaseră.
În dashboard existau numai cele patru rute ale aplicațiilor vechi.

Soluția observată: Cloudflare → my-hello → Routes → Add route → Published
application, pentru meritasaunu.com și www, către `http://127.0.0.1:3002`.
După adăugare, ambele health-uri publice au returnat 200.

Nu transforma automat orice 404 într-o schimbare systemd sau într-un restart
repetat. Verifică întâi rutele publicate și ținta lor. Nu șterge rutele CuStrăini.

## 4. Chrome: ERR_CONNECTION_RESET pe Mac

Observații confirmate:

- Health-ul public din GitHub Actions trecea.
- Direct pe droplet: cloudflared active, homepage local 200, homepage public 200,
  health public `{"ok":true}`.
- Pe Mac, curl se reseta în negocierea TLS, după ClientHello, inclusiv forțând IPv4
  și TLS 1.2. DNS rezolva spre IP-uri Cloudflare.
- Telefonul pe date mobile deschidea site-ul.
- Utilizatorul a confirmat că avea VPN corporate activ. Ulterior a confirmat
  accesul în browser și crearea unui lead în producție.

Aceste dovezi localizează problema pe traseul conexiunii Mac/rețea/VPN.
Politica exactă de filtrare nu a fost inspectată; nu afirma că s-a modificat sau
că s-a identificat o regulă IT specifică. Testează o altă rețea/hotspot. Dacă politica
firmei permite, verifică temporar fără VPN; pentru acces corporate cere verificarea
și permiterea celor două domenii de către IT. Nu dezactiva verificarea TLS a site-ului.

## 5. Formularul răspunde 503

Mesaj exact: „Cererile de ofertă nu sunt încă disponibile. Revino în curând.”
Este condiția `operatorConfigured()` din `lib/config.ts`, nu o eroare SQLite sau VPN.

Trebuie completate în `.env` de pe droplet: OPERATOR_NAME, OPERATOR_ADDRESS,
PRIVACY_EMAIL, SUPPLIER_DISCLOSURE. Date reale, deoarece apar public în politică.
După editare:

```bash
cd /srv/merita-sau-nu
docker compose up -d --force-recreate --wait
```

Simplul restart nu reîncarcă ENV. După completare/recreate, utilizatorul a trimis
cererea pe domeniul real și a văzut leadul în admin. Nu elimina controlul din cod
pentru a masca lipsa configurației.

## 6. Wizard: undefined kW și validare prea târzie

Cauză: validarea întregului obiect la pasul 1 nu executa refinement-ul puterii PV
când câmpurile obligatorii din pașii viitori lipseau. Utilizatorul putea continua
și primea eroarea abia la pasul 5.

Corecție: scheme pe pași, validare condițională independentă, restaurarea draftului
la primul pas invalid și text de rezervă în rezumat. Valoarea gri „6” este un
placeholder, nu o putere introdusă. Regresia este testată unitar și în browser.

## 7. Registry: 3 manifeste la fiecare build

BuildKit genera un index, manifestul imaginii și manifestul de atestare. Primele
nu sunt 3 aplicații, dar apar ca intrări distincte în DOCR. Au existat și versiuni vechi.

Buildul final are `--platform linux/amd64 --provenance=false --sbom=false --load`.
La finalul curățării a fost confirmată o singură imagine latest, aproximativ 70 MiB
în captura de lansare. Dimensiunea nu este un prag sau o garanție pentru viitor.

Un index latest poate referi manifeste fără tag, care trebuie păstrate. De aceea
scriptul protejează recursiv întregul graf, chiar dacă buildul curent este simplu.

## 8. Cleanup: digest latest neidentificat

Citirea tabelului doctl cu awk depindea de formatul afișat. Scriptul final folosește
`--output json`, jq și normalizează digestul cu/fără `sha256:`. Dacă latest lipsește,
este duplicat sau invalid, se oprește înainte de ștergere. A fost văzut doctl v2.1.0
în runner; workflow-ul nu fixează această versiune.

## 9. Cleanup: 412 manifest is referenced

DigitalOcean refuză ștergerea unui copil încă referit de un index vechi. Scriptul
amână numai această eroare specifică, șterge indexurile vechi și reîncearcă.
Dacă o trecere nu face progres, se oprește. Alte erori API nu sunt ignorate.

## 10. Cleanup: fals eșec după ștergerea reușită

API-ul a returnat succes pentru ștergere, dar o citire imediată încă includea
manifeste vechi. Dashboard-ul afișa deja o singură imagine latest.

Verificarea finală citește din nou, maximum 6 încercări cu 5 secunde între ele,
fără ștergeri suplimentare pe baza listei întârziate. Cazul eventual-consistent și
cazul care nu converge sunt testate. Log confirmat după corecție:

```text
Waiting for registry listing to reflect deletions (1/6).
Cleanup verified: 1 current manifest(s) remain.
```

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
