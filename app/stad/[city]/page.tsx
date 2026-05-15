import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllRestaurantsAdmin } from '@/lib/db'
import type { Restaurant } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CITY_CONFIG: Record<string, { name: string; intro: string }> = {
  amsterdam: {
    name: 'Amsterdam',
    intro:
      'Amsterdam heeft de meeste dim sum spots van Nederland. Van klassieke kantonese dim sum bij Oriental City tot verse dumplings bij Fu Dumplings. Dit zijn de plekken waar Gao voor juicht.',
  },
  rotterdam: {
    name: 'Rotterdam',
    intro:
      'Rotterdam heeft een sterke dim sum scene rond het Kruisplein en Katendrecht. Dit zijn de plekken waar Gao voor juicht.',
  },
  'den-haag': {
    name: 'Den Haag',
    intro:
      'Den Haag is een van de beste dim sum steden van Nederland, met spots in Chinatown en daarbuiten. Dit zijn de plekken waar Gao voor juicht.',
  },
  utrecht: {
    name: 'Utrecht',
    intro:
      'Utrecht heeft een groeiende dim sum scene. Dit zijn de plekken waar Gao voor juicht.',
  },
}

const ALL_SLUGS = Object.keys(CITY_CONFIG)

async function getCityRestaurants(slug: string): Promise<Restaurant[]> {
  const config = CITY_CONFIG[slug]
  if (!config) return []
  const all = await getAllRestaurantsAdmin()
  return all
    .filter((r) => r.verified === true && r.city === config.name)
    .sort((a, b) => (b.epicScore ?? 0) - (a.epicScore ?? 0))
}

export async function generateStaticParams() {
  return ALL_SLUGS.map((city) => ({ city }))
}

export async function generateMetadata({
  params,
}: {
  params: { city: string }
}): Promise<Metadata> {
  const config = CITY_CONFIG[params.city]
  if (!config) return {}
  const restaurants = await getCityRestaurants(params.city)
  const count = restaurants.length
  const title = `Beste dim sum in ${config.name} — EpicDimSum`
  const description = `De ${count} beste dim sum restaurants in ${config.name}, handpicked door liefhebbers. Met must-order tips en dumplingscores van Gao.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'nl_NL',
      siteName: 'EpicDimSum',
      images: [
        { url: '/mascots/MasterGao.png', width: 200, height: 200, alt: 'Gao — EpicDimSum mascotte' },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description: `De ${count} beste dim sum spots in ${config.name}.`,
    },
  }
}

const DIM_ICONS = [
  '/mascots/shrimp-toast.png',
  '/mascots/siew-mai.png',
  '/mascots/leaf-rice.png',
  '/mascots/ricerolls.png',
  '/mascots/lotus-bun.png',
]

function filledCount(score: number): number {
  if (score >= 80) return 5
  if (score >= 70) return 4
  return 3
}

function firstSentence(text?: string): string {
  if (!text) return ''
  const m = text.match(/^[^.!?]+[.!?]/)
  return m ? m[0] : text.slice(0, 120)
}

export default async function StadPage({ params }: { params: { city: string } }) {
  const config = CITY_CONFIG[params.city]
  if (!config) notFound()

  const restaurants = await getCityRestaurants(params.city)
  const { name, intro } = config

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Beste dim sum restaurants in ${name}`,
    description: `Handpicked dim sum spots in ${name} door EpicDimSum`,
    itemListElement: restaurants.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Restaurant',
        name: r.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: r.address,
          addressLocality: r.city,
          addressCountry: 'NL',
        },
        url: `https://epicdimsum.nl/restaurant/${r.id}`,
        servesCuisine: 'Dim Sum',
        ...(r.sources?.googleRating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: r.sources.googleRating,
                ratingCount: r.sources.googleReviewCount ?? 1,
                bestRating: 5,
              },
            }
          : {}),
      },
    })),
  }

  return (
    <main className="min-h-screen bg-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream border-b-[3px] border-inkBlack">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/mascots/MasterGao.png"
              alt="Gao"
              width={32}
              height={32}
              className="object-contain shrink-0"
            />
            <span className="font-black text-sm leading-none">
              <span className="text-epicRed">Epic</span>
              <span className="text-epicGreen">Dim</span>
              <span className="text-epicGold">Sum</span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-black text-inkBlack/40 hover:text-inkBlack/70 transition-colors"
          >
            ← Alle plekken
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-4">
          <h1 className="font-black text-3xl leading-tight text-inkBlack mb-1">
            De beste dim sum in {name}
          </h1>
          <p className="text-sm text-inkBlack/50 font-medium">
            Handpicked door liefhebbers, geanalyseerd door Gao
          </p>
        </div>

        {/* Intro */}
        <p className="text-sm text-inkBlack/70 leading-relaxed mb-8">{intro}</p>

        {/* Restaurant list */}
        {restaurants.length === 0 ? (
          <div className="text-center py-12">
            <Image
              src="/mascots/chopsticks.png"
              alt=""
              width={48}
              height={48}
              className="object-contain opacity-40 mx-auto mb-3"
            />
            <p className="font-black text-inkBlack/40">Gao is nog aan het speuren in {name}</p>
          </div>
        ) : (
          <div className="space-y-4 mb-10">
            {restaurants.map((restaurant, index) => {
              const filled = filledCount(restaurant.epicScore ?? 0)
              const snippet = firstSentence(restaurant.summary)
              return (
                <article
                  key={restaurant.id}
                  className="bg-white rounded-2xl border-[3px] border-inkBlack shadow-brutal overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-inkBlack/30 uppercase tracking-wide mb-0.5">
                          #{index + 1}
                        </p>
                        <h2 className="font-black text-base leading-tight text-inkBlack truncate">
                          {restaurant.name}
                        </h2>
                        <p className="text-xs text-inkBlack/40 mt-0.5 truncate">{restaurant.address}</p>
                      </div>
                      <Link
                        href={`/restaurant/${restaurant.id}`}
                        className="shrink-0 text-xs font-black px-3 py-1.5 bg-epicGreen text-cream rounded-full border-2 border-inkBlack shadow-brutal-sm whitespace-nowrap"
                      >
                        Bekijk →
                      </Link>
                    </div>

                    {/* Graadmeter icons */}
                    <div className="flex items-center gap-1 mb-3">
                      {DIM_ICONS.map((src, i) => (
                        <Image
                          key={i}
                          src={src}
                          alt=""
                          width={i < filled ? 24 : 18}
                          height={i < filled ? 24 : 18}
                          className={`object-contain transition-opacity ${
                            i < filled ? 'opacity-100' : 'opacity-15'
                          }`}
                          unoptimized
                        />
                      ))}
                    </div>

                    {/* Must order */}
                    {restaurant.mustOrder && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-black text-epicGold uppercase tracking-wide shrink-0">
                          Must order
                        </span>
                        <span className="text-xs text-inkBlack/70 truncate">{restaurant.mustOrder}</span>
                      </div>
                    )}

                    {/* Summary snippet */}
                    {snippet && (
                      <p className="text-xs text-inkBlack/60 leading-snug line-clamp-2">{snippet}</p>
                    )}
                  </div>
                  <div className="h-1 bg-epicGold/30" />
                </article>
              )
            })}
          </div>
        )}

        {/* Suggest CTA */}
        <div className="mb-10 p-4 bg-white rounded-2xl border-[3px] border-inkBlack shadow-brutal">
          <p className="font-black text-sm mb-1">
            Ken jij een dim sum plek in {name} die hier niet staat?
          </p>
          <p className="text-xs text-inkBlack/50 mb-3">
            Tip Gao een restaurant — hij duikt erin en wie weet wordt het de volgende EpicSpot.
          </p>
          <Link
            href="/#suggest-form"
            className="inline-block text-xs font-black px-4 py-2 bg-epicGreen text-cream rounded-full border-2 border-inkBlack shadow-brutal-sm"
          >
            Tip sturen →
          </Link>
        </div>

        {/* Internal city links */}
        <div className="text-center pb-4">
          <p className="text-xs text-inkBlack/40 mb-2">Meer dim sum ontdekken</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {ALL_SLUGS.filter((s) => s !== params.city).map((slug) => (
              <Link
                key={slug}
                href={`/stad/${slug}`}
                className="text-xs font-black text-epicGreen hover:text-epicGreen/70 transition-colors"
              >
                {CITY_CONFIG[slug].name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-[3px] border-inkBlack mt-12 py-6 bg-inkBlack text-cream">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="font-black text-lg tracking-tight">
            <span className="text-epicRed">Epic</span>
            <span className="text-epicGreen">Dim</span>
            <span className="text-epicGold">Sum</span>
          </p>
          <p className="text-xs text-cream/40 mt-1">
            De beste dim sum in Nederland. Powered by EpicScore™
          </p>
          <Link
            href="/privacy"
            className="text-xs text-cream/40 hover:text-cream/70 transition-colors mt-2 inline-block"
          >
            Privacy
          </Link>
        </div>
      </footer>
    </main>
  )
}
