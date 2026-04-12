'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Mascot from './Mascot'

interface WhySheetProps {
  isOpen: boolean
  onClose: () => void
}

export default function WhySheet({ isOpen, onClose }: WhySheetProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-inkBlack/40" onClick={onClose} />
      <div className="relative w-full bg-cream rounded-t-3xl border-t-[3px] border-inkBlack px-5 pt-4 pb-10 max-h-[75vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-inkBlack/20 rounded-full mx-auto mb-4" />

        <div className="flex items-center gap-3 mb-4">
          <Image src="/mascots/MasterGao.png" alt="Master Gao" width={48} height={48} className="object-contain shrink-0" />
          <div>
            <h2 className="font-black text-lg leading-tight">Gao is jouw gids naar de beste dumplings</h2>
            <p className="text-xs text-inkBlack/40">Beter dan Google voor dim sum</p>
          </div>
        </div>

        {/* Hero statement */}
        <div className="p-4 bg-inkBlack text-cream rounded-2xl mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Image src="/mascots/EpicScoreBrand.png" alt="EpicScore" width={24} height={24} className="object-contain" />
            <p className="font-black text-sm">EpicScore™</p>
          </div>
          <p className="font-black text-sm leading-snug">
            Google laat zien wat <em>populair</em> is.<br />
            Wij laten zien wat <em>goed</em> is.
          </p>
          <p className="text-xs text-cream/60 mt-2 leading-snug">
            EpicScore is altijd betrouwbaar. De Ha Gao Index is de bonus — als die er staat, weet je dat er echte dumpling intelligence achter zit.
          </p>
        </div>

        {/* 3 signal blocks */}
        <div className="space-y-2 mb-5">
          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border-2 border-inkBlack/10">
            <Image src="/mascots/HaGaoIndex.png" alt="Ha Gao Inspector" width={28} height={28} className="object-contain shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-black text-sm">Ha Gao Index</p>
                <span className="text-[9px] bg-epicGold/20 text-epicGold font-black px-2 py-0.5 rounded-full">BONUS</span>
              </div>
              <p className="text-xs text-inkBlack/50 leading-snug mt-0.5">
                Als er voldoende dumpling reviews zijn, berekenen we een Ha Gao Index — hoe goed zijn de dumplings écht? Dit is de icing on the cake bovenop de EpicScore.
              </p>
              <p className="text-[10px] text-inkBlack/30 leading-snug mt-1">
                Niet elk restaurant heeft een Ha Gao Index — maar als je hem ziet, zegt hij iets echts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border-2 border-inkBlack/10">
            <Image src="/mascots/Epicscore.png" alt="" width={28} height={28} className="object-contain shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-sm">Reputatie — 25%</p>
              <p className="text-xs text-inkBlack/50 leading-snug mt-0.5">
                Bewezen kwaliteit via reviews over tijd — niet alleen het laatste jaar.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border-2 border-inkBlack/10">
            <Image src="/mascots/Epicscore.png" alt="" width={28} height={28} className="object-contain shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-sm">Online aandacht + Vibe — 35%</p>
              <p className="text-xs text-inkBlack/50 leading-snug mt-0.5">
                Wordt er echt over gesproken? En hoe voelt het om er te eten?
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-white rounded-xl border-2 border-inkBlack/10 mb-5">
          <Image src="/mascots/basket-full.png" alt="" width={28} height={28} className="object-contain shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-sm">Jouw dumpling journey</p>
            <p className="text-xs text-inkBlack/50 leading-snug mt-0.5">
              Hou bij waar je bent geweest en wat je ervan vond.
              Gao bewaart je mandje — jij ontdekt de beste plekken.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-epicRed text-cream font-black rounded-2xl border-2 border-inkBlack shadow-brutal-sm text-sm flex items-center justify-center gap-2 active:translate-y-[2px] active:shadow-none transition-all"
        >
          <Mascot type="hilarischgao" size={24} />
          Duidelijk — laat de lijst zien
        </button>
      </div>
    </div>
  )
}
