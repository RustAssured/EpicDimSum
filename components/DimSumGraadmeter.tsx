'use client'
import Image from 'next/image'

const ICONS = [
  '/mascots/ha-gao.png',
  '/mascots/siew-mai.png',
  '/mascots/ricerolls.png',
  '/mascots/lotus-bun.png',
  '/mascots/shrimp-toast.png',
]

interface DimSumGraadmeterProps {
  haGaoIndex: number
  size?: 'card' | 'detail'
}

export default function DimSumGraadmeter({ haGaoIndex, size = 'card' }: DimSumGraadmeterProps) {
  const filled = Math.round(haGaoIndex)
  const slotSize = size === 'detail' ? 32 : 28
  const iconSize = size === 'detail' ? 20 : 18

  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] text-inkBlack/40 shrink-0 w-20 pt-1">Dim Sum Mandje</span>
      <div>
        <div className="flex items-center gap-1">
          {ICONS.map((src, i) => (
            <div
              key={i}
              style={{ width: slotSize, height: slotSize }}
              className={`rounded-[6px] flex items-center justify-center border-[1.5px] ${
                i < filled
                  ? 'bg-[#FFF8EB] border-inkBlack'
                  : 'bg-transparent border-inkBlack/20 opacity-25'
              }`}
            >
              <Image
                src={src}
                alt=""
                width={iconSize}
                height={iconSize}
                unoptimized
                className="object-contain"
                onError={(e) => {
                  const parent = e.currentTarget.parentElement as HTMLElement | null
                  if (parent) parent.style.display = 'none'
                }}
              />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-inkBlack/40 opacity-70 mt-1">
          Gao&apos;s graadmeter, niet het menu
        </p>
      </div>
    </div>
  )
}
