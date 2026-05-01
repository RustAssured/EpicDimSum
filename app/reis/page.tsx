import Image from 'next/image'
import Link from 'next/link'
import UpdateEntry from './UpdateEntry'
import BugForm from './BugForm'
import DagboekMarkSeen from '@/components/DagboekMarkSeen'
import { DAGBOEK_COUNT } from '@/lib/dagboek'

export const metadata = {
  title: "Gao's Dagboek, EpicDimSum",
  description: 'Een eerlijk verslag van hoe EpicDimSum wordt gebouwd. Met fouten, fixes en alles daartussen.',
}

const updates = [
  {
    id: 'stickers-en-dagboek',
    date: '1 mei 2026',
    title: 'Gao gaat op avontuur',
    emoji: '📦',
    content: [
      { type: 'paragraph' as const, text: 'Soms gaat het niet zoals gepland. De stickers werden naar een verkeerd adres gestuurd. Oud account, oud leveradres. Klassieke fout.' },
      { type: 'paragraph' as const, text: 'Dus zaten we daar. Met een collega en dim sum fan, op een terrasje op de hoek van een straat in Amsterdam, wachtend op een pakketbezorger. Koffie in de zon. Om 12 uur kwam hij. Stickers geintercepteerd. Missie geslaagd.' },
      { type: 'image' as const, src: '/images/Epicstickers.jpg', alt: 'De eerste EpicSpot stickers', caption: '36 stickers. De eerste batch. Nu nog plakken.' },
      { type: 'paragraph' as const, text: 'Daarna samen naar Fu Dumplings. De derde keer al. De sticker laten zien aan het team, enthousiaste reacties. Volgende keer gaat hij op het raam.' },
      { type: 'bullets' as const, icon: 'dim-journey.png', items: ['Check-in opties zijn nu alleen positief. Solide, Top of Episch. Gao juicht altijd.', 'Na het inchecken kun je een compliment achterlaten: "Wat was epic?" Kort, positief, zichtbaar voor iedereen.', 'En een notitie voor jezelf. Een persoonlijk dim sum dagboekje in je mandje.', 'Alle vage teksten op de site zijn directer gemaakt. Gao vraagt niet meer of je misschien wellicht iets zou willen. Gao zegt: doe het!'] },
    ],
    mistake: 'Stickers naar het verkeerde adres. Soms is de grootste bug niet in de code maar in je eigen bestelgeschiedenis.',
    fixed: true,
    fixedNote: 'Stakeout met koffie. Probleem opgelost.',
  },
  {
    id: 'suggesties-en-community',
    date: '30 april 2026',
    title: 'Gao luistert',
    emoji: '🧺',
    content: [
      {
        type: 'paragraph' as const,
        text: 'Een dim sum liefhebber wilde twee restaurants melden. Het lukte niet. Te technisch, te veel gedoe. Dat is precies het tegenovergestelde van wat EpicDimSum moet zijn.',
      },
      {
        type: 'paragraph' as const,
        text: 'Als iemand de moeite neemt om een plek te delen, moet dat voelen als een gesprek. Niet als een formulier.',
      },
      {
        type: 'bullets' as const,
        icon: 'dim-journey.png',
        items: [
          'Restaurant suggereren kan nu met alleen een naam en een stad. Geen technische links meer, geen Place IDs. Gao zoekt de rest zelf uit.',
          'Suggesties van gebruikers krijgen een eigen plek in de admin. Dat is goud en verdient aandacht.',
          'Restaurants waar 3 of meer dim sum liefhebbers zijn geweest laten dat nu zien. Subtiel, maar het maakt de reis een stukje minder alleen.',
        ],
      },
      {
        type: 'paragraph' as const,
        text: 'De beste plekken komen niet alleen uit data. Ze komen van mensen die net zo van dim sum houden als Gao.',
      },
    ],
    mistake: 'De suggestie flow was te technisch. Mensen haakten af voordat ze hun tip konden delen.',
    fixed: true,
    fixedNote: 'Naam en stad is genoeg. Gao doet de rest.',
  },
  {
    id: 'privacy-klaar',
    date: '28 april 2026',
    title: 'Gao speelt volgens de regels',
    emoji: '🔒',
    content: [
      {
        type: 'paragraph' as const,
        text: 'EpicDimSum heeft een privacybeleid. Niet omdat het spannend is, maar omdat het hoort. Geen tracking, geen cookies, geen advertenties. Gewoon dim sum.',
      },
      {
        type: 'bullets' as const,
        icon: 'dim-pin.png',
        items: [
          'Privacybeleid live op epicdimsum.com/privacy. Kort, eerlijk, in het Nederlands.',
          'Geen Google Analytics, geen tracking cookies. We volgen je niet over het internet.',
          'De sticker is goedgekeurd door de drukker. Vrijdag 1 mei in huis.',
        ],
      },
    ],
    mistake: null,
    fixed: false,
  },
  {
    id: 'eerste-stap',
    date: '24 april 2026',
    title: 'De eerste stap wordt makkelijker',
    emoji: '👣',
    content: [
      {
        type: 'paragraph' as const,
        text: 'Een collega en absolute dim sum kenner probeerde de site en vond het lastig om erin te komen. Niet omdat het er niet goed uitzag, maar omdat het niet duidelijk was waar je moest beginnen.',
      },
      {
        type: 'paragraph' as const,
        text: 'Dat is een belangrijk signaal. Als iemand die van dim sum houdt niet meteen snapt wat de bedoeling is, dan is dat geen gebruikersprobleem. Dan is dat een Gao-probleem.',
      },
      {
        type: 'bullets' as const,
        icon: 'dim-journey.png',
        items: [
          'Nieuwe bezoekers zien nu een zachte welkomstkaart. Gao wijst je de weg, geen handleiding.',
          'Het Dim Sum Mandje laat zien wat je kunt doen als het nog leeg is. Niet leeg en stil, maar leeg en uitnodigend.',
          'Op de detailpagina staat nu een subtiele hint boven de check-in. Ben je hier geweest? Bewaar deze plek.',
        ],
      },
      {
        type: 'paragraph' as const,
        text: 'Het doel is niet uitleggen hoe het werkt. Het doel is iemand helpen de eerste stap te zetten. De rest volgt vanzelf.',
      },
    ],
    mistake: 'Gao ging ervan uit dat iedereen het meteen zou snappen. Dat was naief.',
    fixed: true,
    fixedNote: 'Begeleiding toegevoegd. Niet opdringerig, wel aanwezig.',
  },
  {
    id: 'reis-notificatie',
    date: '23 april 2026',
    title: 'Gao tikt op je schouder',
    emoji: '🔴',
    content: [
      {
        type: 'paragraph' as const,
        text: 'Vanaf nu zie je een klein rood bolletje bij Reis als er iets nieuws in het dagboek staat. Niet opdringerig bedoeld uiteraard. Gewoon een teken dat Gao iets te melden heeft.',
      },
    ],
    mistake: null,
    fixed: false,
  },
  {
    id: 'labels-weg',
    date: '23 april 2026',
    title: 'Minder labels, meer eerlijkheid',
    emoji: '🔍',
    content: [
      {
        type: 'paragraph' as const,
        text: 'Gisteren introduceerde Gao labels voor restaurants. "Dim sum restaurant" of "Dumpling specialist". Leek logisch. Was het niet.',
      },
      {
        type: 'paragraph' as const,
        text: 'Want wat doe je met een restaurant dat noedels als basis heeft maar uitstekende wontons serveert? Of een breed Chinees restaurant waar dim sum gewoon een categorie is? Die passen niet in een label van twee woorden.',
      },
      {
        type: 'bullets' as const,
        icon: 'dim-pin.png',
        items: [
          'Labels verwijderd. Ze waren te bot en zeiden niks over kwaliteit.',
          'De rankReason per restaurant vertelt het echte verhaal. Die is specifiek, eerlijk en per restaurant anders.',
        ],
      },
    ],
    mistake: 'Labels te snel toegevoegd. Categoriseren is makkelijk, nuance is moeilijker.',
    fixed: true,
    fixedNote: 'Labels weg. Nuance terug.',
  },
  {
    id: 'dim-sum-wereld',
    date: '22 april 2026',
    title: 'Dim sum is meer dan dumplings',
    emoji: '🧺',
    content: [
      {
        type: 'paragraph' as const,
        text: 'Een dim sum kenner vroeg het simpelweg: is dit een dumpling app of een dim sum app? Die vraag bleef hangen.',
      },
      {
        type: 'paragraph' as const,
        text: 'Het antwoord: EpicDimSum is een dim sum gids die dumplings als graadmeter gebruikt. Dumplings zijn de methode, dim sum is de wereld. Maar dat moet je niet hoeven uitleggen. Dat moet je zien.',
      },
      {
        type: 'bullets' as const,
        icon: 'siew-mai.png',
        items: [
          'De graadmeter toont nu vijf verschillende dim sum gerechten in plaats van alleen dumplings. Shrimp toast, siew mai, rijstrolletjes, lotus bun en meer.',
          'Het Dumpling Mandje heet nu het Dim Sum Mandje. Want je vult een mandje dim sum, niet alleen dumplings.',
          'Restaurants krijgen een label: "Dim sum restaurant" of "Dumpling specialist". Allebei welkom, maar het verschil mag er zijn.',
          'Onder de motorkap: Gao leert beter onderscheiden tussen restaurants die goed zijn in dim sum en restaurants die toevallig ook dumplings serveren. Dat kost tijd en eerlijkheid.',
        ],
      },
      {
        type: 'paragraph' as const,
        text: 'Ook gefixt: een bug waardoor gesuggereerde restaurants altijd in Amsterdam terechtkwamen, ongeacht hun echte stad. Fu Dumplings Rotterdam stond in Amsterdam. Sorry daarvoor.',
      },
    ],
    mistake: 'De engine is nog niet scherp genoeg. Gao werkt eraan, stap voor stap. Verwacht geen perfectie, verwacht wel eerlijkheid.',
    fixed: false,
  },
  {
    id: 'epicspot-sticker',
    date: '20 april 2026',
    title: 'Gao krijgt een stempel',
    emoji: '🏅',
    content: [
      {
        type: 'paragraph' as const,
        text: 'Gao verlaat binnenkort het scherm. Voor het eerst. Op een sticker.',
      },
      {
        type: 'bullets' as const,
        icon: 'Ha-Gao-star.png',
        items: [
          'De EpicSpot sticker is klaar. Rond, met een dikke rand, EPICSPOT in rood en groen.',
          'Aankomend weekend gaat de sticker op het raam van Fu Dumplings Amsterdam. De eerste.',
        ],
      },
      {
        type: 'image' as const,
        src: '/mascots/sticker.png',
        alt: 'EpicSpot sticker',
        caption: 'De eerste EpicSpot sticker. Binnenkort op het raam van Fu Dumplings Amsterdam.',
      },
      {
        type: 'paragraph' as const,
        text: 'Als die sticker erop zit, dan is het echt.',
      },
    ],
    mistake: 'Het Dim Sum Mandje was te subtiel. Nieuwe gebruikers konden niet direct zien waar ze konden inloggen.',
    fixed: true,
    fixedNote: 'JourneyCard is prominenter gemaakt. Vul jouw Dim Sum Mandje, log in en bewaar jouw dim sum reis.',
  },
  {
    id: 'fu-dumplings-moment',
    date: '19 april 2026',
    title: 'Gao verlaat het scherm',
    emoji: '🥟',
    content: [
      {
        type: 'paragraph' as const,
        text: 'Vandaag gebeurde iets wat Gao niet had verwacht. Hij verliet het scherm.',
      },
      {
        type: 'paragraph' as const,
        text: 'Vandaag was het dan toch echt zover. Tijd om de nummer 1 spot van EpicDimSum eindelijk eens te bezoeken. En kon ik het niet laten om te melden dat ik via EpicDimSum.com hier terecht was gekomen. Superleuke reacties en een zeer vriendelijke eigenaar die nieuwsgierig werd naar de site. Toffe gesprekken volgden ook met een andere gast, of beter gezegd, Dim Sum fan! Met potentieel nog wat spots die Gao nog niet kent, dus die gaan zeker het mandje in. En de dumplings? Epic. Uiteraard!',
      },
      {
        type: 'paragraph' as const,
        text: 'Er komt een sticker. Voor op de deur. Want als Gao ergens voor juicht, mag de wereld dat weten.',
      },
    ],
    mistake: 'Gao staat nog niet bij genoeg restaurants op de deur.',
    fixed: false,
  },
  {
    id: 'crispy-clear',
    date: '17 april 2026',
    title: 'Crispy clear',
    emoji: '✨',
    content: [
      {
        type: 'paragraph' as const,
        text: 'Gao heeft vandaag geleerd dat een product pas echt klaar voelt als je stopt met toevoegen en begint met verfijnen.',
      },
      {
        type: 'bullets' as const,
        icon: 'Dumpling-check.png',
        items: [
          'De Dim Sum Reis kaart staat nu tussen de controls en de lijst, eerst jij, dan Gao.',
          'Niet ingelogd? Gao wacht op je eerste plek. Ingelogd? Je reis is zichtbaar.',
          'De hele kaart is klikbaar, geen knopje maar een echte ingang.',
          'Tactiele feedback bij hover en tap, het voelt nu als bewegen, niet klikken.',
          'Feedback tab in admin: bug reports direct zichtbaar, markeerbaar als afgehandeld.',
          'Help Gao knop onderaan elke restaurantpagina, laagdrempelig, open, uitnodigend.',
        ],
      },
      {
        type: 'paragraph' as const,
        text: 'En het icon systeem is af. Chopsticks voor ambacht. Ha Gao voor kwaliteit. Siew Mai als je siu mai moet bestellen. Een taal die betekenis draagt.',
      },
      {
        type: 'bullets' as const,
        icon: 'chopsticks.png',
        items: [
          "Gao's Dagboek: van Reis naar Dagboek. Want een dagboek bevat fouten, inzichten en eerlijke gedachten.",
          'Max-width container hersteld, desktop ziet er weer netjes uit.',
          'Geflagde restaurants verwijderbaar via admin, bulk delete plus zichtbare feedback.',
        ],
      },
      {
        type: 'paragraph' as const,
        text: 'Iemand zei vandaag: "crispy clear." Dat is precies wat Gao wilde horen.',
      },
    ],
    mistake: 'De EpicScore en Ha Gao uitlegpills stonden nog op desktop zichtbaar terwijl ze op mobiel al verborgen waren. Inconsistent, en eigenlijk overbodig nu de WHY sheet die uitleg geeft.',
    fixed: true,
    fixedNote: 'Pills volledig verwijderd op alle schermen. De WHY knop doet dit werk beter.',
  },
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
          'Score bars verdwenen. Reputatie, Vibe, Online aandacht. Allemaal weg. Gao vertrouwt je om zelf te kiezen.',
          'Dumplings zijn de score. Geen getal, geen percentage. Gewoon: hoeveel dumplings Gao uitdeelt.',
          'Must Order staat nu bovenaan, eerste wat je ziet als je een restaurant opent.',
          "Bullets in plaats van alinea's, waarom Gao ergens voor juicht is nu scanbaar.",
          'Sticky Reserveer knop, altijd zichtbaar, ook als je scrolt.',
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
          'Dumpling Intelligence Engine v2 draait op drie bronnen: Iens, Tripadvisor en web search.',
          'Nederland compleet, alle 14 provinciale hoofdsteden plus Rotterdam.',
          'Het Dim Sum Mandje is live: badges, bezoekhistorie, GaoMandje.',
          'Google login werkt, check-ins zijn authentiek en persistent.',
          'De score is eerlijker dan ooit, geen cijfers, alleen dumplings.',
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
    date: '10 april 2026',
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
          'Next.js, Supabase, Google Places API, Claude Haiku. In een paar dagen gebouwd.',
          'De Ha Gao Index werd geboren, niet hoeveel sterren maar hoe goed de dumplings écht zijn.',
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
      <DagboekMarkSeen count={DAGBOEK_COUNT} />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream border-b-[3px] border-inkBlack">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/mascots/MasterGao.png" alt="Gao" width={36} height={36} className="object-contain" />
            <div>
              <p className="font-black text-sm leading-none tracking-tight" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, letterSpacing: '0.01em' }}>
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
