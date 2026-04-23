'use client'

import { useEffect } from 'react'

const LS_KEY = 'gao-dagboek-seen'

export default function DagboekMarkSeen({ count }: { count: number }) {
  useEffect(() => {
    localStorage.setItem(LS_KEY, String(count))
  }, [count])

  return null
}
