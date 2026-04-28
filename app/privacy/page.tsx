import Link from 'next/link'

export const metadata = {
  title: 'Privacybeleid, EpicDimSum',
  description: 'Hoe EpicDimSum omgaat met je gegevens. Kort, eerlijk en AVG-compliant.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 bg-cream border-b-[3px] border-inkBlack">
        <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-epicGreen font-medium hover:underline"
          >
            ← Terug
          </Link>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-8 text-inkBlack">
        <h1 className="font-black text-3xl tracking-tight leading-tight">
          Privacybeleid
        </h1>
        <p className="text-xs text-inkBlack/40 mt-2">
          Laatst bijgewerkt: 28 april 2026
        </p>

        <section className="mt-8 space-y-2">
          <h2 className="font-black text-base">Wat we verzamelen</h2>
          <p className="text-sm leading-relaxed">
            Als je inlogt via Google bewaren we je naam, e-mailadres en profielfoto. Deze gebruiken we alleen om je Dim Sum Mandje te koppelen aan jouw account. We delen deze gegevens niet met derden.
          </p>
          <p className="text-sm leading-relaxed">
            Als je incheckt bij een restaurant bewaren we welk restaurant je hebt bezocht en eventuele notities die je zelf achterlaat. Deze check-ins zijn alleen voor jou zichtbaar.
          </p>
          <p className="text-sm leading-relaxed">
            Als je een restaurant suggereert via "Help Gao" bewaren we de suggestie. Geen persoonsgegevens worden hierbij opgeslagen tenzij je bent ingelogd.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-black text-base">Wat we niet doen</h2>
          <p className="text-sm leading-relaxed">
            We gebruiken geen tracking cookies, geen Google Analytics, geen advertenties en geen data-verkoop. We volgen je niet over het internet.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-black text-base">Lokale opslag</h2>
          <p className="text-sm leading-relaxed">
            We gebruiken localStorage in je browser om voorkeuren te onthouden, zoals of je de welkomstkaart hebt gezien. Dit wordt niet naar onze servers gestuurd en is geen cookie.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-black text-base">Externe diensten</h2>
          <p className="text-sm leading-relaxed">
            We gebruiken Google Places API om restaurantinformatie op te halen, Google OAuth voor inloggen, Supabase voor dataopslag en Vercel voor hosting. Elk van deze diensten heeft een eigen privacybeleid.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-black text-base">Je rechten</h2>
          <p className="text-sm leading-relaxed">
            Je kunt op elk moment je account en alle bijbehorende gegevens laten verwijderen door een e-mail te sturen naar{' '}
            <a href="mailto:rusthoven@proton.me" className="text-epicGreen hover:underline">
              rusthoven@proton.me
            </a>
            . Onder de AVG heb je recht op inzage, correctie en verwijdering van je gegevens.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="font-black text-base">Contact</h2>
          <p className="text-sm leading-relaxed">
            Vragen over privacy? Mail naar{' '}
            <a href="mailto:rusthoven@proton.me" className="text-epicGreen hover:underline">
              rusthoven@proton.me
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
