import Image from 'next/image'

interface Update {
  id: string
  date: string
  title: string
  emoji: string
  content: string[]
  mistake: string
  fixed: boolean
  fixedNote?: string
}

export default function UpdateEntry({ update }: { update: Update }) {
  return (
    <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-inkBlack flex items-center justify-center text-xl shrink-0">
          {update.emoji}
        </div>
        <div>
          <p className="font-black text-base leading-tight">{update.title}</p>
          <p className="text-[10px] text-inkBlack/40 mt-0.5">{update.date}</p>
        </div>
      </div>

      <div className="px-5 pb-4 space-y-2">
        {update.content.map((line, i) => (
          <p key={i} className="text-xs text-inkBlack/70 leading-relaxed">{line}</p>
        ))}
      </div>

      <div className="mx-5 mb-5 p-3 rounded-xl bg-epicRed/5 border-2 border-epicRed/20">
        <div className="flex items-center gap-2 mb-1">
          <Image src="/mascots/lowconfidence.png" alt="Gao twijfelt" width={20} height={20} className="object-contain" />
          <p className="text-[10px] font-black text-epicRed uppercase tracking-wide">
            {update.fixed ? 'Gao had het mis — nu gefixed!' : 'Gao zit hier mogelijk mis'}
          </p>
        </div>
        <p className="text-xs text-inkBlack/60 leading-snug italic">{update.mistake}</p>
        {update.fixed && update.fixedNote && (
          <div className="mt-2 pt-2 border-t border-epicGreen/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Image src="/mascots/dumpling-check.png" alt="gefixed" width={16} height={16} className="object-contain" />
              <p className="text-[10px] font-black text-epicGreen">Opgelost</p>
            </div>
            <p className="text-[10px] text-inkBlack/50 leading-snug italic">{update.fixedNote}</p>
          </div>
        )}
      </div>

      <div className="h-2 bg-epicRed" />
    </div>
  )
}
