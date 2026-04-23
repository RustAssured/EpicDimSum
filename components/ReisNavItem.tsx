'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const LS_KEY = 'gao-dagboek-seen'

export default function ReisNavItem({ count }: { count: number }) {
  const [unseenCount, setUnseenCount] = useState(0)

  useEffect(() => {
    const seen = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10)
    setUnseenCount(Math.max(0, count - seen))
  }, [count])

  return (
    <Link
      href="/reis"
      className="relative flex items-center gap-1 text-xs font-bold text-inkBlack/40 hover:text-inkBlack/70 transition-colors"
    >
      <Image src="/mascots/dumpling-pin.png" alt="" width={12} height={12} className="object-contain" />
      Reis
      {unseenCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          background: '#D85A30',
          color: 'white',
          fontSize: '9px',
          fontWeight: 700,
          borderRadius: '999px',
          minWidth: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 4px',
          lineHeight: 1,
        }}>
          {unseenCount}
        </span>
      )}
    </Link>
  )
}
