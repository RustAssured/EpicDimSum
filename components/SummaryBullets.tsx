import Image from 'next/image'

interface SummaryBulletsProps {
  summary: string
}

function getBulletIcon(sentence: string): string {
  const s = sentence.toLowerCase()
  if (s.includes('handgemaakt') || s.includes('ambacht') || s.includes('vers') || s.includes('gevouwen') || s.includes('handmade')) {
    return 'chopsticks.png'
  }
  if (s.includes('uitzonderlijk') || s.includes('bijzonder') || s.includes('outstanding') || s.includes('best')) {
    return 'Ha-Gao-star.png'
  }
  if (s.includes('review') || s.includes('consistent') || s.includes('altijd') || s.includes('betrouwbaar')) {
    return 'Dumpling-check.png'
  }
  return 'ha-gao.png'
}

export default function SummaryBullets({ summary }: SummaryBulletsProps) {
  const sentences = summary
    .split(/[.!;]/)
    .map(s => s.trim())
    .filter(s => s.length > 15)
    .slice(0, 3)

  if (sentences.length === 0) {
    return <p className="text-sm text-inkBlack/70 leading-relaxed">{summary}</p>
  }

  return (
    <ul className="space-y-2.5">
      {sentences.map((sentence, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <Image
            src={`/mascots/${getBulletIcon(sentence)}`}
            alt=""
            width={18}
            height={18}
            className="object-contain shrink-0 mt-0.5"
          />
          <p className="text-sm text-inkBlack/70 leading-snug">{sentence}</p>
        </li>
      ))}
    </ul>
  )
}
