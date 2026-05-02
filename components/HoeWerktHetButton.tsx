'use client'
import { useState } from 'react'
import WhySheet from '@/components/WhySheet'

export default function HoeWerktHetButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-inkBlack/30 hover:text-inkBlack/60 transition-colors font-medium"
      >
        Hoe werkt het?
      </button>
      <WhySheet isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
