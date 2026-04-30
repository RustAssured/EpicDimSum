import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getAllRestaurants, getRestaurantById } from '@/lib/db'
import StatusBadge from '@/components/StatusBadge'
import CheckIn from '@/components/CheckIn'
import CheckInHint from '@/components/CheckInHint'
import SummaryBullets from '@/components/SummaryBullets'
import RestaurantPhoto from '@/components/RestaurantPhoto'
import DimSumGraadmeter from '@/components/DimSumGraadmeter'

export const revalidate = 3600

interface PageProps {
  params: { id: string }
}

export async function generateStaticParams() {
  const restaurants = await getAllRestaurants()
  return restaurants.map((r) => ({ id: r.id }))
}

function dumplingScale(score: number): { count: number; label: string } {
  if (score >= 80) return { count: 5, label: 'Gao is door het dolle' }
  if (score >= 70) return { count: 4, label: 'Gao is blij' }
  return { count: 3, label: 'Gao is fan' }
}

function getDimSumIcon(dish: string): string | null {
  const d = dish.toLowerCase()
  if (d.includes('ha gao') || d.includes('har gow') || d.includes('garnaal')) return '/mascots/dim-pin.png'
  if (d.includes('siew mai') || d.includes('siu mai')) return '/mascots/siew-mai.png'
  if (d.includes('cheung fun') || d.includes('rijstrol')) return '/mascots/ricerolls.png'
  if (d.includes('bao') || d.includes('broodje') || d.includes('bun')) return '/mascots/lotus-bun.png'
  if (d.includes('lo mai') || d.includes('lotus')) return '/mascots/leaf-rice.png'
  if (d.includes('toast') || d.includes('garnalen toast')) return '/mascots/shrimp-toast.png'
  if (d.includes('spons') || d.includes('sponge') || d.includes('cake')) return '/mascots/sponge-cake.png'
  if (d.includes('water') || d.includes('chestn')) return '/mascots/water-chestnut.png'
  if (d.includes('pens') || d.includes('tripe') || d.includes('maag')) return '/mascots/beef-stomache.png'
  return null
}

export default async function RestaurantPage({ params }: PageProps) {
  const [restaurant, allRestaurants] = await Promise.all([
    getRestaurantById(params.id),
    getAllRestaurants(),
  ])
  if (!restaurant) notFound()

  const { name, city, address, priceRange, status, epicScore, haGaoIndex, haGaoDetail, mustOrder, summary, reviewSnippets, sources } = restaurant

  const { count: dumplingCount, label: gaoLabel } = dumplingScale(epicScore ?? 0)

  const routeUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${restaurant.googlePlaceId}`
  const reservationFallback = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + city)}`

  const similarRestaurants = allRestaurants
    .filter((r) => r.city === city && r.id !== params.id)
    .sort((a, b) => b.epicScore - a.epicScore)
    .slice(0, 2)

  const communityCheckins =
    restaurant.communityCheckins ??
    ((sources as Record<string, unknown>).communityCheckins as number | undefined) ??
    0
  const communityFirePct = (sources as Record<string, unknown>).communityFirePct as number | undefined

  return (
    <>
    <main className="min-h-screen bg-cream pb-24">
      <div className="max-w-2xl mx-auto">

      {/* Back header */}
      <header className="sticky top-0 z-40 bg-cream border-b-[3px] border-inkBlack px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-xs font-black text-inkBlack/50">
          ← Terug
        </Link>
        <p className="font-black text-sm truncate max-w-[200px]">{name}</p>
        <div className="w-16" />
      </header>

      {/* Photo header */}
      {restaurant.photoReference && (
        <RestaurantPhoto
          photoReference={restaurant.photoReference}
          restaurantName={restaurant.name}
        />
      )}

      {/* Unified hero block */}
      <div className="bg-white border-b-[3px] border-inkBlack px-5 pt-5 pb-6">

        {/* Dumplings + name + gao label as one unit */}
        <div className="mb-4">
          <div className="flex items-center gap-1 mb-2">
            {[
              '/mascots/shrimp-toast.png',
              '/mascots/siew-mai.png',
              '/mascots/leaf-rice.png',
              '/mascots/ricerolls.png',
              '/mascots/lotus-bun.png',
            ].map((src, i) => (
              <Image
                key={i}
                src={src}
                alt=""
                width={i < dumplingCount ? 30 : 20}
                height={i < dumplingCount ? 30 : 20}
                className={`object-contain ${i < dumplingCount ? 'opacity-100' : 'opacity-15'}`}
                unoptimized
              />
            ))}
          </div>
          <p className="text-[10px] text-inkBlack/40 opacity-70 mb-2">Gao&apos;s graadmeter, niet het menu</p>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-black text-2xl leading-tight">{name}</h1>
              <p className="text-xs font-black text-inkBlack/50 mt-0.5">{gaoLabel}</p>
            </div>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-inkBlack/40 mt-1">{city} · {priceRange}</p>
        </div>

        {/* Must Order */}
        {mustOrder && (
          <div className="bg-epicGold/10 border-2 border-epicGold/40 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center gap-2 mb-1">
              {getDimSumIcon(mustOrder ?? '') && (
                <Image src={getDimSumIcon(mustOrder ?? '')!} alt="" width={22} height={22} className="object-contain" unoptimized />
              )}
              <p className="text-[10px] font-black text-epicGold uppercase tracking-wide">Must Order</p>
            </div>
            <p className="text-sm font-black text-inkBlack">{mustOrder}</p>
          </div>
        )}

        {/* Why bullets */}
        {summary && (
          <div>
            <p className="text-[10px] font-black text-inkBlack/30 uppercase tracking-wide mb-2">
              Waarom Gao hier voor juicht
            </p>
            <SummaryBullets summary={summary} />
          </div>
        )}
      </div>

      {/* Ha Gao Index — secondary expert layer */}
      {haGaoIndex > 0 && (
        <div className="mx-4 mt-5 p-4 rounded-2xl border-2 border-inkBlack/10 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Image src="/mascots/HaGaoIndex.png" alt="" width={24} height={24} className="object-contain" />
              <p className="text-xs font-black text-inkBlack">Ha Gao Index</p>
            </div>
            <span className="font-black text-lg">{haGaoIndex.toFixed(1)}<span className="text-xs text-inkBlack/30">/5</span></span>
          </div>
          {haGaoDetail && (
            <p className="text-xs text-inkBlack/60 italic leading-snug">{haGaoDetail}</p>
          )}
        </div>
      )}

      {/* Review snippets — social proof before CTA */}
      {reviewSnippets && reviewSnippets.length > 0 && (
        <div className="mx-4 mt-6 space-y-2">
          {reviewSnippets.slice(0, 3).map((review, i) => (
            <div key={i} className="p-4 bg-white rounded-xl border border-inkBlack/10">
              <p className="text-xs text-inkBlack/70 leading-relaxed italic">&ldquo;{review}&rdquo;</p>
            </div>
          ))}
        </div>
      )}

      {/* Community signal */}
      {communityCheckins >= 3 && (
        <div className="mx-4 mt-3 flex items-center gap-2">
          <Image src="/mascots/GaoMandje.png" alt="" width={16} height={16} className="object-contain" />
          <p className="text-[13px] text-inkBlack/50">
            {communityCheckins} dim sum liefhebbers zijn hier geweest
            {communityFirePct !== undefined && communityFirePct >= 70 && ' · merendeel vond het on fire!'}
          </p>
        </div>
      )}

      {/* Check-in — after social proof */}
      <div className="mx-4 mt-4">
        <CheckInHint restaurantId={restaurant.id} />
        <CheckIn
          restaurantId={restaurant.id}
          restaurantName={name}
          restaurantCity={city}
        />
      </div>

      {/* Location */}
      <div className="mx-4 mt-5 p-4 bg-white rounded-xl border border-inkBlack/10">
        <p className="text-[10px] font-black text-inkBlack/30 uppercase tracking-wide mb-1">Locatie</p>
        <p className="text-sm text-inkBlack/70">{address}</p>
      </div>

      {/* Similar restaurants */}
      {similarRestaurants.length > 0 && (
        <div className="mx-4 mt-6">
          <p className="text-[10px] font-black text-inkBlack/30 uppercase tracking-wide mb-2">
            Vergelijkbaar
          </p>
          <div className="space-y-2">
            {similarRestaurants.map(r => (
              <Link
                key={r.id}
                href={`/restaurant/${r.id}`}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-inkBlack/10 active:bg-inkBlack/5"
              >
                <p className="text-xs font-black">{r.name}</p>
                <div className="flex items-center gap-1">
                  <Image src="/mascots/dumpling.png" alt="" width={14} height={14} className="object-contain" />
                  <span className="text-[10px] text-inkBlack/40 font-bold">{r.city}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Help Gao — subtle, friendly */}
      <div className="mx-4 mt-8 mb-2 text-center">
        <p className="text-[10px] text-inkBlack/30 mb-1">
          Klopt er iets niet aan deze plek?
        </p>
        <Link
          href={`/reis?restaurant=${encodeURIComponent(restaurant.name)}#bug`}
          className="text-[10px] font-black text-inkBlack/40 hover:text-epicGreen transition-colors"
        >
          Help Gao beter worden →
        </Link>
      </div>

      </div>{/* end max-w-2xl */}
    </main>

    {/* Sticky CTA — always visible on mobile */}
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3 bg-cream border-t-[3px] border-inkBlack">
      <a
        href={routeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 py-3 text-center text-xs font-black border-2 border-inkBlack rounded-2xl bg-cream"
      >
        Route →
      </a>
      <a
        href={restaurant.reservationUrl ?? reservationFallback}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-[2] py-3 text-center text-xs font-black border-2 border-inkBlack rounded-2xl bg-epicGreen text-cream shadow-brutal-sm"
      >
        Reserveer →
      </a>
      </div>{/* end inner CTA */}
    </div>
    </>
  )
}
