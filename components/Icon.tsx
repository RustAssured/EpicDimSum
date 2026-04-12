import Image from 'next/image'

interface IconProps {
  src: string
  alt: string
  size?: number
  className?: string
}

export default function Icon({ src, alt, size = 20, className = '' }: IconProps) {
  return (
    <Image
      src={`/mascots/${src}`}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain shrink-0 active:scale-95 transition-transform ${className}`}
    />
  )
}
