'use client'

import { useState, useEffect } from 'react'

export default function CheckInHint({ restaurantId }: { restaurantId: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const alreadyCheckedIn = !!localStorage.getItem(`checkin_${restaurantId}`)
    if (!alreadyCheckedIn) setShow(true)
  }, [restaurantId])

  if (!show) return null

  return (
    <p className="text-xs text-inkBlack/40 mb-2">
      Geweest? Check in en bewaar deze plek! 🥟
    </p>
  )
}
