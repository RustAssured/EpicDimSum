'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Restaurant } from '@/lib/types'
import restaurantsData from '@/data/restaurants.json'
import InboxSection, { getInboxCount } from '@/components/admin/InboxSection'
import RestaurantsSection from '@/components/admin/RestaurantsSection'
import BeheerSection from '@/components/admin/BeheerSection'

type Tab = 'inbox' | 'restaurants' | 'beheer'

const DISMISS_KEY_PREFIX = 'inbox_dismissed_'

export default function AdminSyncPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [adminRestaurants, setAdminRestaurants] = useState<Restaurant[]>(
    restaurantsData as Restaurant[]
  )
  const [activeTab, setActiveTab] = useState<Tab>('inbox')
  const [inboxCount, setInboxCount] = useState(0)

  // Load ALL restaurants from DB on auth
  useEffect(() => {
    if (!secret || !authed) return
    fetch('/api/admin/restaurants', {
      headers: { 'x-sync-secret': secret },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAdminRestaurants(data)
      })
      .catch(() => {})
  }, [secret, authed])

  // Recalculate inbox count when restaurants change. Reads dismissed-set
  // from localStorage so the badge stays in sync with InboxSection.
  useEffect(() => {
    setInboxCount(getInboxCount(adminRestaurants))
    const onStorage = () => setInboxCount(getInboxCount(adminRestaurants))
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    }
  }, [adminRestaurants])

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (secret.trim()) setAuthed(true)
  }

  const handleUpdate = (id: string, patch: Partial<Restaurant>) => {
    setAdminRestaurants((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    )
  }

  const handleRemove = (id: string) => {
    setAdminRestaurants((prev) => prev.filter((r) => r.id !== id))
    // also clear any dismiss key so badge stays accurate
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`${DISMISS_KEY_PREFIX}${id}`)
    }
    setInboxCount(getInboxCount(adminRestaurants.filter((r) => r.id !== id)))
  }

  const handleAdd = (r: Restaurant) => {
    setAdminRestaurants((prev) => {
      const exists = prev.some((p) => p.id === r.id)
      return exists ? prev.map((p) => (p.id === r.id ? r : p)) : [r, ...prev]
    })
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white p-6">
            <h1 className="text-xl font-black text-inkBlack mb-1">Admin Sync</h1>
            <p className="text-sm text-inkBlack/50 mb-4">Voer je sync secret in</p>
            <form onSubmit={handleAuth} className="space-y-3">
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="SYNC_SECRET"
                className="w-full px-4 py-3 rounded-full border-[3px] border-inkBlack shadow-brutal-md bg-cream text-sm font-medium focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-3 rounded-full border-[3px] border-inkBlack shadow-brutal font-black text-sm bg-epicRed text-cream hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
              >
                Inloggen
              </button>
            </form>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 bg-cream border-b-[3px] border-inkBlack">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-black text-inkBlack/60 hover:text-inkBlack transition-colors"
          >
            ← Home
          </Link>
          <h1 className="font-black text-inkBlack flex-1">Admin Sync Panel</h1>
          <span className="text-xs bg-epicGreen/20 text-epicGreen border border-epicGreen/30 rounded-full px-2 py-0.5 font-bold">
            Ingelogd
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 py-2.5 rounded-xl border-2 border-inkBlack text-xs font-black transition-all ${
              activeTab === 'inbox' ? 'bg-inkBlack text-cream' : 'bg-cream text-inkBlack'
            }`}
          >
            Inbox ({inboxCount})
          </button>
          <button
            onClick={() => setActiveTab('restaurants')}
            className={`flex-1 py-2.5 rounded-xl border-2 border-inkBlack text-xs font-black transition-all ${
              activeTab === 'restaurants' ? 'bg-inkBlack text-cream' : 'bg-cream text-inkBlack'
            }`}
          >
            Restaurants
          </button>
          <button
            onClick={() => setActiveTab('beheer')}
            className={`flex-1 py-2.5 rounded-xl border-2 border-inkBlack text-xs font-black transition-all ${
              activeTab === 'beheer' ? 'bg-inkBlack text-cream' : 'bg-cream text-inkBlack'
            }`}
          >
            Beheer
          </button>
        </div>

        {activeTab === 'inbox' && (
          <InboxSection
            secret={secret}
            restaurants={adminRestaurants}
            onRemove={handleRemove}
            onUpdate={handleUpdate}
          />
        )}

        {activeTab === 'restaurants' && (
          <RestaurantsSection
            secret={secret}
            restaurants={adminRestaurants}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            onAdd={handleAdd}
          />
        )}

        {activeTab === 'beheer' && <BeheerSection secret={secret} />}
      </div>
    </main>
  )
}
