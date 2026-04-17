import Image from 'next/image'

interface SummaryBulletsProps {
  summary: string
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
    <ul className="space-y-2">
      {sentences.map((sentence, i) => (
        <li key={i} className="flex items-start gap-2">
          <Image
            src="/mascots/dumpling-check.png"
            alt=""
            width={16}
            height={16}
            className="object-contain shrink-0 mt-0.5"
          />
          <p className="text-sm text-inkBlack/70 leading-snug">{sentence}</p>
        </li>
      ))}
    </ul>
  )
}
