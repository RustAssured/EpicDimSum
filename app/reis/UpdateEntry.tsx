import Image from 'next/image'

interface UpdateItem {
  type: 'paragraph' | 'bullets' | 'image'
  text?: string
  items?: string[]
  icon?: string
  src?: string
  alt?: string
  caption?: string
}

interface Update {
  id: string
  date: string
  title: string
  emoji: string
  content: UpdateItem[]
  mistake: string | null
  fixed: boolean
  fixedNote?: string
}

export default function UpdateEntry({ update }: { update: Update }) {
  return (
    <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-inkBlack flex items-center justify-center text-xl shrink-0">
          {update.emoji}
        </div>
        <div>
          <p className="font-black text-base leading-tight">{update.title}</p>
          <p className="text-[10px] text-inkBlack/40 mt-0.5">{update.date}</p>
        </div>
      </div>

      {/* Mixed content */}
      <div className="px-5 pb-4 space-y-3">
        {update.content.map((item, i) => {
          if (item.type === 'paragraph') {
            return (
              <p key={i} className="text-xs text-inkBlack/70 leading-relaxed">
                {item.text}
              </p>
            )
          }
          if (item.type === 'bullets') {
            return (
              <ul key={i} className="space-y-2">
                {item.items?.map((bullet, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <Image
                      src={`/mascots/${item.icon ?? 'ha-gao.png'}`}
                      alt=""
                      width={16}
                      height={16}
                      className="object-contain shrink-0 mt-0.5"
                    />
                    <p className="text-xs text-inkBlack/70 leading-snug">{bullet}</p>
                  </li>
                ))}
              </ul>
            )
          }
          if (item.type === 'image' && item.src) {
            return (
              <div key={i} className="rounded-xl overflow-hidden border border-inkBlack/10">
                <Image
                  src={item.src}
                  alt={item.alt ?? ''}
                  width={600}
                  height={400}
                  className="w-full object-cover"
                />
                {item.caption && (
                  <p className="text-[10px] text-inkBlack/40 italic px-3 py-2 bg-inkBlack/3">
                    {item.caption}
                  </p>
                )}
              </div>
            )
          }
          return null
        })}
      </div>

      {/* Mistake block */}
      {update.mistake !== null && <div className="mx-5 mb-5 p-3 rounded-xl bg-epicRed/5 border-2 border-epicRed/20">
        <div className="flex items-center gap-2 mb-1">
          <Image src="/mascots/lowconfidence.png" alt="" width={20} height={20} className="object-contain" />
          <p className="text-[10px] font-black text-epicRed uppercase tracking-wide">
            {update.fixed ? 'Gao had het mis, nu gefixed!' : 'Gao zit hier mogelijk mis'}
          </p>
        </div>
        <p className="text-xs text-inkBlack/60 leading-snug italic">{update.mistake}</p>
        {update.fixed && update.fixedNote && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-epicGreen/20">
            <Image src="/mascots/Dumpling-check.png" alt="" width={14} height={14} className="object-contain" />
            <p className="text-[10px] font-black text-epicGreen">{update.fixedNote}</p>
          </div>
        )}
      </div>}

      <div className="h-2 bg-epicRed" />
    </div>
  )
}
