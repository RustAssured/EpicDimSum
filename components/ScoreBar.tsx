interface ScoreBarProps {
  label: string
  score: number
  color: string
}

export default function ScoreBar({ label, score, color }: ScoreBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-inkBlack/70 w-16 shrink-0">{label}</span>
      <div className="flex-1 bg-inkBlack/10 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-black text-inkBlack w-6 text-right">{score}</span>
    </div>
  )
}
