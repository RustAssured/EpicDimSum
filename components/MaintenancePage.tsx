'use client'
import Image from 'next/image'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
      <Image
        src="/mascots/MasterGaoBrand.png"
        width={120}
        height={120}
        alt="Gao"
        unoptimized
      />
      <h1 className="font-black text-2xl mt-6 text-inkBlack">
        Gao is even aan het opruimen
      </h1>
      <p className="text-inkBlack/60 mt-2 max-w-xs">
        EpicDimSum wordt nog even bijgewerkt. We zijn er zo weer!
      </p>
    </div>
  )
}
