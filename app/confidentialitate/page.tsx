import type { Metadata } from 'next';
import { PRIVACY_POLICY_VERSION } from '../../lib/privacy';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Politica de confidențialitate',
  alternates: { canonical: '/confidentialitate' },
};
export default function Privacy() {
  const operator = process.env.OPERATOR_NAME;
  const email = process.env.PRIVACY_EMAIL;
  return (
    <main id="main" className="container legal-page">
      <span className="eyebrow">DATELE TALE</span>
      <h1>Politica de confidențialitate</h1>
      <p className="micro">Versiune {PRIVACY_POLICY_VERSION}</p>
      {(!operator || !email || !process.env.SUPPLIER_DISCLOSURE) && (
        <p className="notice">
          Versiune de pregătire pentru lansare. Identitatea operatorului, datele de contact și
          informațiile despre destinatari trebuie completate înainte de colectarea cererilor reale.
        </p>
      )}
      <h2>Cine prelucrează datele</h2>
      <p>
        Operator: {operator || '[de completat înainte de lansare]'}. Adresă:{' '}
        {process.env.OPERATOR_ADDRESS || '[de completat]'}. Contact pentru date personale:{' '}
        {email ? <a href={`mailto:${email}`}>{email}</a> : '[de completat înainte de lansare]'}.
      </p>
      <h2>Ce date colectăm și de ce</h2>
      <p>
        Calculatorul poate fi folosit fără nume sau telefon. Datele despre sistem, consum și
        obiectiv sunt păstrate în sesiunea browserului pentru a putea continua calculul. Când
        soliciți oferte, salvăm aceste date împreună cu numele, telefonul, județul, localitatea,
        situația de proprietar, emailul și detaliile oferite opțional.
      </p>
      <p>
        Folosim cererea pentru verificarea informațiilor și facilitarea primirii de oferte de la
        maximum 3 furnizori relevanți. Baza pentru acest flux este consimțământul exprimat separat,
        nebifat implicit. Nu te înscriem la newsletter și nu folosim acordul pentru marketing.
      </p>
      <h2>Cine poate primi datele</h2>
      <p>
        Cererile pot fi consultate de administratorii autorizați și, după verificare, de maximum 3
        furnizori relevanți pentru zona și solicitarea ta. Destinatari / categorii și informații
        relevante: {process.env.SUPPLIER_DISCLOSURE || '[de completat înainte de lansare]'}.
      </p>
      <p>
        Infrastructura folosește DigitalOcean pentru găzduire și Cloudflare pentru rutarea și
        protecția traficului. Configurația efectivă de găzduire, locația datelor și eventualele
        transferuri internaționale trebuie documentate de operator înainte de lansare.
      </p>
      <h2>Securitate, duplicate și prioritizare</h2>
      <p>
        Păstrăm data, textul acordului și versiunea politicii. Numărul de telefon ne ajută să marcăm
        solicitările posibil duplicate din ultimele 30 de zile. Un scor intern simplu ajută la
        ordonarea verificărilor; nu produce decizii automate cu efect juridic.
      </p>
      <p>
        Pentru protecția formularului putem păstra un identificator HMAC al adresei IP și informații
        tehnice despre browser. Limităm accesul la admin. Jurnalele tehnice ale infrastructurii pot
        conține metadate de trafic; operatorul stabilește retenția acestora.
      </p>
      <h2>Cât timp păstrăm datele</h2>
      <p>
        Politica propusă pentru solicitări este de maximum 180 de zile de la ultima actualizare,
        apoi ștergere sau anonimizare, cu excepția obligațiilor legale aplicabile. Operatorul
        trebuie să aplice și să verifice această retenție, inclusiv pentru exporturi, copii de
        siguranță și destinatari. Backupurile și exporturile nu sunt publice.
      </p>
      <h2>Stocare locală și măsurare</h2>
      <p>
        Stocarea de sesiune păstrează progresul calculatorului și parametrii UTM ai vizitei. Datele
        de contact nu sunt salvate în această stocare. Dacă este configurat Google Analytics, acesta
        este activat numai după acordul separat pentru măsurare. Poți retrage acest acord ștergând
        preferința „merita_analytics” din stocarea browserului și reîncărcând pagina; formularul
        rămâne disponibil fără Analytics.
      </p>
      <h2>Drepturile tale</h2>
      <p>
        Poți solicita acces, rectificare, ștergere, restricționare și portabilitate, după caz, și
        îți poți retrage consimțământul contactând operatorul. Retragerea nu afectează prelucrarea
        legală anterioară; operatorul va informa destinatarii relevanți, dacă este cazul. Poți
        depune o plângere la ANSPDCP, prin{' '}
        <a href="https://www.dataprotection.ro/" rel="noreferrer">
          dataprotection.ro
        </a>
        .
      </p>
      <h2>Fără date inutile</h2>
      <p>
        Nu trimite CNP, acte de identitate, date financiare sau alte informații sensibile în câmpul
        de detalii. Furnizarea contactului este opțională pentru utilizarea calculatorului, dar
        necesară dacă dorești să soliciți oferte.
      </p>
    </main>
  );
}
