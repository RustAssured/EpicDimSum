interface HaGaoIndexProps {
  index: number // 0-5
  size?: 'sm' | 'md'
}

export default function HaGaoIndex({ index, size = 'md' }: HaGaoIndexProps) {
  const total = 5
  const filled = Math.round(index)
  const partial = index - Math.floor(index)

  const squareSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < filled
        const isPartial = i === filled && partial > 0.3

        return (
          <div
            key={i}
            className={`${squareSize} rounded-sm border-[1.5px] border-inkBlack transition-colors`}
            style={{
              backgroundColor: isFilled
                ? '#1D9E75'
                : isPartial
                ? `rgba(29,158,117,${partial})`
                : 'transparent',
            }}
            title={`Ha Gao Index: ${index}/5`}
          />
        )
      })}
      <span className="text-xs font-black text-inkBlack ml-0.5">{index.toFixed(1)}</span>
    </div>
  )
}
