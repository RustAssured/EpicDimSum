'use client'
import { useState } from 'react'

export function AboutSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-inkBlack/40" onClick={onClose} />
      <div className="relative w-full bg-cream rounded-t-3xl border-t-[3px] border-inkBlack px-5 pt-4 pb-10 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-inkBlack/20 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <img src="/mascots/MasterGao.png" alt="Master Gao" className="w-[52px] h-[52px] object-contain shrink-0" />
          <div>
            <h2 className="font-black text-lg leading-tight">Over EpicDimSum</h2>
            <p className="text-xs text-inkBlack/40 leading-tight">een labor of love</p>
          </div>
        </div>

        {/* Body copy */}
        <div className="space-y-4 mb-6">
          <p className="text-sm text-inkBlack/80 leading-relaxed">
            EpicDimSum is gemaakt omdat ik moe werd van het zoeken naar goede dim sum in Nederland.
            Google toont je wat populair is — niet wat goed is. Een tent met 4,2 sterren en 800 reviews
            kan nog steeds slechte har gow serveren.
          </p>
          <p className="text-sm text-inkBlack/80 leading-relaxed">
            Gao is de dumpling judge die ik altijd wilde hebben: eerlijk, halsstarrig en volledig
            geobsedeerd door de kwaliteit van de har gow. Hij combineert Google data, Iens, Tripadvisor
            en online buzz tot één score die je echt kunt vertrouwen.
          </p>
        </div>

        {/* Promise block */}
        <div className="relative bg-[#fff3d6] border-2 border-inkBlack/20 rounded-2xl p-4 mb-6 overflow-hidden">
          <p className="text-xs font-black uppercase tracking-wide text-inkBlack/50 mb-2">De EpicDimSum belofte</p>
          <ul className="space-y-1.5 text-sm text-inkBlack/80 leading-relaxed">
            <li>Geen gesponsorde restaurants</li>
            <li>Geen populariteitsscores — alleen kwaliteit</li>
            <li>Ha Gao als ultieme maatstaf voor dumplingvakmanschap</li>
            <li>Altijd eerlijk, ook als het teleurstellend is</li>
          </ul>
          <img
            src="/mascots/MasterGao.png"
            alt=""
            className="absolute bottom-2 right-3 w-8 h-8 object-contain opacity-40"
          />
        </div>

        {/* Signature */}
        <div className="mb-6">
          <p className="text-sm text-inkBlack/60 italic mb-1">— Woo Jung, maker van EpicDimSum</p>
          <a
            href="mailto:hello@epicdimsum.com"
            className="text-xs font-black text-epicRed underline underline-offset-2"
          >
            Tip een restaurant → hello@epicdimsum.com
          </a>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-epicRed text-cream font-black rounded-2xl border-2 border-inkBlack shadow-brutal-sm text-sm"
        >
          Sluiten
        </button>
      </div>
    </div>
  )
}

export default function About() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-inkBlack/30 hover:text-inkBlack/60 transition-colors font-medium"
      >
        Over
      </button>
      <AboutSheet isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
