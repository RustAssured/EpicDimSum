'use client'
import { useEffect } from 'react'
import Image from 'next/image'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 text-center">
      <Image
        src="/mascots/cryinggao.png"
        alt="Er ging iets mis"
        width={80}
        height={80}
        className="object-contain mb-4"
      />
      <p className="font-black text-lg text-inkBlack mb-1">Aiii... er ging iets mis</p>
      <p className="text-xs text-inkBlack/50 mb-5">
        Gao is er kapot van. Probeer het opnieuw.
      </p>
      <button
        onClick={reset}
        className="text-xs font-black px-4 py-2.5 bg-epicRed text-cream rounded-full border-2 border-inkBlack shadow-brutal-sm"
      >
        Probeer opnieuw
      </button>
    </div>
  )
}
