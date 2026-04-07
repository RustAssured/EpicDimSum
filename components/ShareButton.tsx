'use client'

interface ShareButtonProps {
  name: string
}

export default function ShareButton({ name }: ShareButtonProps) {
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert(`Link gekopieerd! Deel ${name} met vrienden 🥟`)
    }).catch(() => {
      // Fallback: show URL in prompt
      prompt('Kopieer deze link:', window.location.href)
    })
  }

  return (
    <button
      onClick={handleShare}
      className="w-full py-3 rounded-full border-[3px] border-inkBlack shadow-brutal font-black text-sm bg-epicGreen text-cream hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
    >
      🔗 Deel deze spot
    </button>
  )
}
