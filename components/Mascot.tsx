import Image from 'next/image'

type MascotType = 'happy' | 'judge' | 'lowconfidence' | 'mustorder' | 'sleepy' | 'top1'

interface MascotProps {
  type: MascotType
  size?: number
  className?: string
  alt?: string
}

export default function Mascot({ type, size = 40, className = '', alt }: MascotProps) {
  return (
    <Image
      src={`/mascots/${type}.png`}
      alt={alt ?? `Gao the dumpling — ${type}`}
      width={size}
      height={size}
      className={`object-contain drop-shadow-sm ${className}`}
    />
  )
}
