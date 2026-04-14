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
    id: 'origin',
    date: 'April 2026',
    title: 'Het begin',
    emoji: '🥟',
    content: [
      'Gao bestond nog niet. EpicDimSum bestond nog niet. Er was alleen een idee en een passie voor dim sum.',
      'In een paar dagen werd een volledig product gebouwd — Next.js, Supabase, Google Places API, Claude Haiku. Een eigen scoring engine die niemand nabootst.',
      'De Ha Gao Index werd geboren. Niet hoeveel sterren een restaurant heeft, maar hoe goed de dumplings écht zijn.',
      'En toen verscheen Gao. Klein, rond, met grote ogen en een nog grotere mening over dumplings.',
    ],
    mistake: 'Gao dacht dat 5 Google reviews genoeg waren om een Ha Gao Index te berekenen. Dat bleek niet zo. Iens, Tripadvisor en web search geven een veel eerlijker beeld.',
    fixed: true,
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
                <p className="text-xs text-inkBlack/40 mt-0.5">Een eerlijk verslag van wat werkt, wat niet werkt, en wat we samen leren.</p>
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
        <div className="rounded-2xl border-[3px] border-epicPurple/40 shadow-[6px_6px_0px_rgba(83,74,183,0.3)] bg-epicPurple/5 p-5 mb-8">
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
