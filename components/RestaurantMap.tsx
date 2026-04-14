'use client'

import { useEffect, useRef } from 'react'
import { Restaurant } from '@/lib/types'

interface RestaurantMapProps {
  restaurants: Restaurant[]
  userLocation?: { lat: number; lng: number }
  onRestaurantClick?: (id: string) => void
}

export default function RestaurantMap({ restaurants, userLocation, onRestaurantClick }: RestaurantMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return

    // Only run client-side (dynamic import guarantees this, but belt-and-suspenders)
    import('leaflet').then((L) => {
      // Fix default icon paths broken by webpack
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const withCoords = restaurants.filter((r) => r.coords)

      // Center on user location, or mean of restaurant coords, or Amsterdam
      let center: [number, number] = [52.37, 4.895]
      let zoom = 7
      if (userLocation) {
        center = [userLocation.lat, userLocation.lng]
        zoom = 12
      } else if (withCoords.length > 0) {
        const avgLat = withCoords.reduce((s, r) => s + r.coords!.lat, 0) / withCoords.length
        const avgLng = withCoords.reduce((s, r) => s + r.coords!.lng, 0) / withCoords.length
        center = [avgLat, avgLng]
      }

      const map = L.map(mapRef.current!, { zoomControl: true, scrollWheelZoom: false }).setView(center, zoom)
      leafletMapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Gao pin icon
      const gaoIcon = L.divIcon({
        html: `<div style="width:32px;height:32px;background:white;border:3px solid #1a1a1a;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 #1a1a1a">
          <img src="/mascots/dumpling-pin.png" style="width:18px;height:18px;transform:rotate(45deg);object-fit:contain" />
        </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -34],
      })

      // User location icon
      if (userLocation) {
        const userIcon = L.divIcon({
          html: `<div style="width:36px;height:36px;background:#D85A30;border:3px solid #1a1a1a;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 #1a1a1a">
            <img src="/mascots/votegao.png" style="width:22px;height:22px;object-fit:contain" />
          </div>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup('<b>Jij bent hier</b>')
      }

      // Restaurant markers
      withCoords.forEach((r) => {
        const marker = L.marker([r.coords!.lat, r.coords!.lng], { icon: gaoIcon })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:sans-serif;min-width:160px">
              <p style="font-weight:900;font-size:14px;margin:0 0 2px">${r.name}</p>
              <p style="font-size:11px;color:#666;margin:0 0 6px">${r.city} · ${r.priceRange}</p>
              <p style="font-size:11px;margin:0 0 6px;color:#444">${r.mustOrder ?? ''}</p>
              <a href="/restaurant/${r.id}" style="font-size:11px;font-weight:900;color:#1D9E75;text-decoration:none">
                Bekijk details →
              </a>
            </div>`,
            { maxWidth: 240 }
          )

        if (onRestaurantClick) {
          marker.on('popupopen', () => {
            const el = marker.getPopup()?.getElement()
            el?.querySelector('a')?.addEventListener('click', (e) => {
              e.preventDefault()
              onRestaurantClick(r.id)
            })
          })
        }
      })
    })

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update user location marker reactively
  useEffect(() => {
    if (!leafletMapRef.current || !userLocation) return
    leafletMapRef.current.setView([userLocation.lat, userLocation.lng], 12)
  }, [userLocation])

  return (
    <>
      {/* Leaflet CSS */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <div
        ref={mapRef}
        className="w-full rounded-2xl border-[3px] border-inkBlack overflow-hidden shadow-brutal"
        style={{ height: '60vh', minHeight: 320 }}
      />
    </>
  )
}
