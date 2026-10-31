# Pre-launch checklist

Completează cu dovezi reale înainte de trafic. Codul pregătește verificările;
nu confirmă automat configurarea externă sau auditul juridic.

- [ ] APP_URL este domeniul final HTTPS
- [ ] DNS / Cloudflare Tunnel funcționează
- [ ] origin port este doar 127.0.0.1
- [ ] TRUST_CF_HEADERS=true
- [ ] ADMIN_USERNAME configurat
- [ ] ADMIN_PASSWORD_HASH nou
- [ ] SESSION_SECRET nou
- [ ] OPERATOR_NAME complet
- [ ] OPERATOR_ADDRESS complet
- [ ] PRIVACY_EMAIL complet
- [ ] SUPPLIER_DISCLOSURE complet
- [ ] politica de confidențialitate verificată
- [ ] termenii verificați
- [ ] backup testat
- [ ] backup offsite configurat
- [ ] restore testat
- [ ] admin protejat prin Cloudflare Access dacă este disponibil
- [ ] calculator testat pe telefon real
- [ ] lead test trimis
- [ ] lead apare în admin
- [ ] status poate fi schimbat
- [ ] CSV export verificat
- [ ] UTM TikTok testat
- [ ] analytics consent testat
- [ ] healthcheck verde

Verifică și restaurarea offsite într-un mediu izolat, refuzul uploadului la eroare,
monitorizarea backupului zilnic și spațiul disponibil. Pentru GA4 dezactivează
Enhanced Measurement / colectarea automată a formularelor înainte de activare.
Vezi [runbook](docs/PRODUCTION_READINESS.md).
