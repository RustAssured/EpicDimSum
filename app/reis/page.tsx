import Image from 'next/image'
import Link from 'next/link'
import UpdateEntry from './UpdateEntry'
import BugForm from './BugForm'

export const metadata = {
  title: "Gao's Reis — EpicDimSum",
  description: 'Een eerlijk verslag van hoe EpicDimSum wordt gebouwd. Met fouten, fixes en alles daartussen.',
}

const updates = [
  {
    id: 'minder-meer',
    date: '17 april 2026',
    title: 'De week dat minder meer werd',
    emoji: '🔥',
    content: [
      {
        type: 'paragraph' as const,
        text: 'Gao heeft deze week iets geleerd dat hij niet verwacht had. Niet hoe hij meer restaurants kon vinden. Maar hoe hij er minder kon laten zien.',
      },
      {
        type: 'bullets' as const,
        icon: 'Dumpling-check.png',
        items: [
          'Score bars verdwenen — Reputatie, Vibe, Online aandacht. Allemaal weg. Gao vertrouwt je om zelf te kiezen.',
          'Dumplings zijn de score. Geen getal, geen percentage. Gewoon: hoeveel dumplings Gao uitdeelt.',
          'Must Order staat nu bovenaan — eerste wat je ziet als je een restaurant opent.',
          "Bullets in plaats van alinea's — waarom Gao ergens voor juicht is nu scanbaar.",
          'Sticky Reserveer knop — altijd zichtbaar, ook als je scrolt.',
        ],
      },
      {
        type: 'paragraph' as const,
        text: 'Nederland heeft nu 14 steden. Inclusief Middelburg, dat tegen alle verwachtingen in wél dim sum heeft. Maastricht niet. Gao was ook verrast.',
      },
      {
        type: 'bullets' as const,
        icon: 'chopsticks.png',
        items: [
          'Chopsticks = ambacht en handgemaakt',
          'Ha Gao icoon = dumplingkwaliteit',
          'Siew Mai icoon = als je siu mai moet bestellen',
          'Ha Gao met ster = uitzonderlijke kwaliteit',
        ],
      },
      {
        type: 'paragraph' as const,
        text: 'Een systeem dat taal spreekt in plaats van decoratie. Dat is het doel.',
      },
    ],
    mistake: 'Gao heeft restaurants geflagged die eigenlijk goede dim sum serveerden. En restaurants zonder dim sum stonden nog te lang in de lijst. De agent is streng maar niet perfect. Gao ook niet.',
    fixed: false,
  },
  {
    id: 'launch-week',
    date: '14 april 2026',
    title: 'De week dat alles klikte',
    emoji: '🥟',
    content: [
      {
        type: 'paragraph' as const,
        text: 'Wat een week. Gao heeft hard gewerkt. Heel hard.',
      },
      {
        type: 'bullets' as const,
        icon: 'ha-gao.png',
        items: [
          'Dumpling Intelligence Engine v2 draait op drie bronnen — Iens, Tripadvisor en web search.',
          'Nederland compleet — alle 14 provinciale hoofdsteden plus Rotterdam.',
          'Het Dumpling Mandje is live — badges, bezoekhistorie, GaoMandje.',
          'Google login werkt — check-ins zijn authentiek en persistent.',
          'De score is eerlijker dan ooit — geen cijfers, alleen dumplings.',
        ],
      },
      {
        type: 'paragraph' as const,
        text: 'En het allerbelangrijkste: we besloten dat EpicDimSum geen directory is. Het is een keurmerk. Gao staat achter elk restaurant op deze lijst. Persoonlijk.',
      },
    ],
    mistake: 'Gao dacht dat 5 Google reviews genoeg waren voor een Ha Gao Index. Oriental City Amsterdam kreeg ten onrechte geen score.',
    fixed: true,
    fixedNote: 'Dumpling Intelligence Engine v2 lost dit op. Oriental City scoort nu 4.2/5 Ha Gao Index. Terecht.',
  },
  {
    id: 'origin',
    date: 'April 2026',
    title: 'Het begin',
    emoji: '🌱',
    content: [
      {
        type: 'paragraph' as const,
        text: 'Gao bestond nog niet. EpicDimSum bestond nog niet. Er was alleen een idee en een passie voor dim sum.',
      },
      {
        type: 'bullets' as const,
        icon: 'Ha-Gao-star.png',
        items: [
          'Next.js, Supabase, Google Places API, Claude Haiku — in een paar dagen gebouwd.',
          'De Ha Gao Index werd geboren — niet hoeveel sterren, maar hoe goed de dumplings écht zijn.',
          'Gao verscheen. Klein, rond, met grote ogen en een grote mening over dumplings.',
        ],
      },
      {
        type: 'paragraph' as const,
        text: 'Gebouwd door iemand die nog nooit zoiets had gemaakt. En dat voelde, en voelt, groter dan verwacht.',
      },
    ],
    mistake: 'Gao dacht dat 5 Google reviews genoeg waren om een Ha Gao Index te berekenen. Dat bleek niet zo.',
    fixed: true,
    fixedNote: 'Dumpling Intelligence Engine v2 lost dit op met Iens, Tripadvisor en web search.',
  },
]

export default function ReisPage() {
  return (
    <main className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream border-b-[3px] border-inkBlack">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/mascots/MasterGao.png" alt="Gao" width={36} height={36} className="object-contain" />
            <div>
              <p className="font-black text-sm leading-none">
                <span className="text-epicRed">Epic</span>
                <span className="text-epicGreen">Dim</span>
                <span className="text-epicGold">Sum</span>
              </p>
              <p className="text-[9px] text-inkBlack/40 leading-none mt-0.5">terug naar de lijst</p>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 bg-epicGold/10 border-2 border-epicGold/30 rounded-full px-3 py-1.5">
            <Image src="/mascots/dumpling-pin.png" alt="reis" width={16} height={16} className="object-contain" />
            <span className="text-[10px] font-black text-epicGold">Gao&apos;s Reis</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Food collage */}
        <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal overflow-hidden mb-6">
          <div className="sm:flex sm:items-center">

            {/* Photo */}
            <div className="sm:w-1/2 shrink-0">
              <Image
                src="/images/dimsum-collage.jpg"
                alt="Een leven vol dim sum en dumplings"
                width={600}
                height={400}
                className="w-full h-56 sm:h-full object-cover"
              />
            </div>

            {/* Text */}
            <div className="p-5 sm:w-1/2 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Image
                  src="/mascots/hilarischgao.png"
                  alt="Gao blij"
                  width={32}
                  height={32}
                  className="object-contain shrink-0"
                />
                <p className="font-black text-sm text-inkBlack">De aanleiding</p>
              </div>
              <p className="text-sm text-inkBlack/70 leading-relaxed">
                Ja, dat ik van dim sum en dumplings hou, moge duidelijk zijn.
                Met op de foto het bewijs van veel (te veel?) heerlijke dumplings,
                bao&apos;s en meer. En die liefde voor deze heerlijke gerechten heeft
                mij geïnspireerd om de meest epische dim sum bij elkaar te verzamelen!
              </p>
            </div>

          </div>
          <div className="h-2 bg-epicRed" />
        </div>

        {/* Voorwoord */}
        <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white overflow-hidden mb-8">
          <div className="p-5">
            <div className="flex items-start gap-4 mb-5">
              <Image
                src="/mascots/MasterGao.png"
                alt="Gao"
                width={64}
                height={64}
                className="object-contain shrink-0"
              />
              <div>
                <p className="font-black text-lg leading-tight">Gao&apos;s Reis</p>
                <p className="text-xs text-inkBlack/40 mt-0.5">Gao juicht altijd. Hoe hoger de score, hoe harder hij juicht.</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-inkBlack/70 leading-relaxed">
              <p>En zo begon een reis die ik nooit had verwacht te maken.</p>
              <p>Wat begon als een paar flarden gedachten, denkend aan mijn favoriete eten, dim sum, heeft me hier geleid. EpicDimSum.com. Een gids met alleen de meest epische dim sum, want dat is waar ik naar op zoek ben. Niet de populairste. De beste.</p>
              <p>Met veel AI-tooling, eindeloze discussies, brainstorms en back-and-forths is dit gebouwd. Door iemand die nog nooit zoiets had gemaakt. En dat voelde, en voelt, groter dan ik had verwacht.</p>
              <p>Gelukkig waren we al snel niet meer alleen.</p>
              <p>Gao verscheen. Klein, rond, met grote ogen en een nog grotere mening over dumplings. Hij vergezelt ons sindsdien op deze epische reis en zet zich iedere dag noest in om de beste dim sum te vinden, EpicDimSum steeds beter te maken, en eerlijk te zijn als hij ernaast zit.</p>
              <p>Want dat doet hij soms. Ernaast zitten. En dat is precies waarom deze pagina bestaat.</p>
              <p className="font-black text-inkBlack">Gao&apos;s Reis is geen gepolijste changelog. Het is een eerlijk verslag van wat werkt, wat niet werkt, en wat we samen hebben geleerd.</p>
              <p>Ga je mee op dit avontuur? Volg Gao hier, help hem verder bouwen en word deel van dit verhaal.</p>
            </div>

            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-inkBlack/10">
              <Image src="/mascots/happy.png" alt="Gao" width={28} height={28} className="object-contain" />
              <p className="text-xs font-black text-inkBlack/60 italic">Woo Jung &amp; Gao 🥟🗺️</p>
            </div>
          </div>
          <div className="h-2 bg-epicGold" />
        </div>

        {/* Bug melden */}
        <div id="bug" className="rounded-2xl border-[3px] border-epicPurple/40 shadow-[6px_6px_0px_rgba(83,74,183,0.3)] bg-epicPurple/5 p-5 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Image src="/mascots/HaGaoIndex.png" alt="Gao inspecteert" width={40} height={40} className="object-contain shrink-0" />
            <div>
              <p className="font-black text-sm">Gao zit hier mogelijk mis</p>
              <p className="text-xs text-inkBlack/50 mt-0.5">Help Gao beter worden. Meld een bug, een fout of een suggestie.</p>
            </div>
          </div>
          <BugForm />
        </div>

        {/* Updates */}
        <div className="space-y-6">
          <p className="text-xs font-black text-inkBlack/40 uppercase tracking-widest">Updates</p>
          {updates.map((update) => (
            <UpdateEntry key={update.id} update={update} />
          ))}
        </div>

      </div>
    </main>
  )
}
