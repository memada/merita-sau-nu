import type { Metadata } from 'next';
import { DISCLAIMER } from '../../lib/privacy';
export const metadata: Metadata = {
  title: 'Termeni și condiții',
  alternates: { canonical: '/termeni' },
};
export default function Terms() {
  return (
    <main id="main" className="container legal-page">
      <span className="eyebrow">CLARITATE DE LA ÎNCEPUT</span>
      <h1>Termeni și condiții</h1>
      <h2>Ce oferă platforma</h2>
      <p>
        Merită sau Nu este un instrument informativ pentru proprietarii din România. Calculatorul
        estimează un interval de capacitate pentru baterii, pornind de la consumul de seară/noapte
        declarat sau estimat.
      </p>
      <h2>Limitele estimării</h2>
      <p>
        <strong>{DISCLAIMER}</strong> Rezultatul nu reprezintă proiectare, consultanță tehnică
        individualizată, ofertă comercială, garanție de compatibilitate sau de economii. Nu
        calculează amortizarea investiției.
      </p>
      <p>
        Formula pentru consum necunoscut este consum lunar ÷ 30 × 45%. Pentru categoriile declarate
        folosim valori reprezentative de 3, 6, 10 sau 15 kWh. Intervalele rezultate sunt 5, 5–10,
        10–15 și 15+ kWh. Producția sezonieră, surplusul disponibil, pierderile, capacitatea
        utilizabilă, puterea de descărcare și compatibilitatea invertorului trebuie verificate
        separat.
      </p>
      <h2>Solicitarea de oferte</h2>
      <p>
        Poți cere ca solicitarea să fie verificată și transmisă către maximum 3 furnizori relevanți,
        cu acordul tău explicit. Trimiterea formularului nu garantează existența furnizorilor
        disponibili, un anumit număr de oferte, un preț sau un termen de răspuns. Nu ai obligația de
        a cumpăra.
      </p>
      <p>
        Platforma nu vinde sau instalează echipamente în acest MVP. Alegerea unui furnizor și orice
        contract ulterior se analizează separat. Nu există plăți, abonamente sau conturi pentru
        instalatori.
      </p>
      <h2>Utilizarea corectă</h2>
      <p>
        Introdu date corecte și propriile date de contact. Nu trimite solicitări automate,
        informații despre alte persoane fără drept sau conținut abuziv. Putem limita cererile pentru
        protecția serviciului.
      </p>
      <h2>Operator și contact</h2>
      <p>
        Datele operatorului și modalitatea de exercitare a drepturilor sunt publicate în{' '}
        <a href="/confidentialitate">Politica de confidențialitate</a>. Înainte de cumpărare,
        discută cu un specialist autorizat despre condițiile reale ale locuinței tale.
      </p>
    </main>
  );
}
