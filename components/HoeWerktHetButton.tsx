'use client'
import { useState } from 'react'
import WhySheet from '@/components/WhySheet'

export default function HoeWerktHetButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-inkBlack/25 hover:text-inkBlack/60 transition-colors font-medium"
      >
        <span className="md:hidden">Uitleg</span>
        <span className="hidden md:inline">Hoe werkt het?</span>
      </button>
      <WhySheet isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
