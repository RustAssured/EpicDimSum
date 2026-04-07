export interface IensData {
  rating: number | null
  reviewCount: number | null
  rawText: string
}

export async function fetchIensData(restaurantName: string, city: string): Promise<IensData> {
  const query = encodeURIComponent(`${restaurantName} ${city}`)
  const url = `https://www.iens.nl/search?q=${query}`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; EpicDimSum/1.0; +https://epicdimsum.nl)',
        Accept: 'text/html',
      },
      cache: 'no-store',
      // 8 second timeout
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return { rating: null, reviewCount: null, rawText: '' }
    }

    const html = await res.text()

    // Extract rating: look for patterns like "8.5" or "8,5" in rating contexts
    const ratingMatch = html.match(/(?:score|rating|cijfer)[^>]*>[\s]*([0-9][,\.][0-9])/i)
    const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : null

    // Extract review count: look for patterns like "123 reviews"
    const reviewMatch = html.match(/(\d+)\s*(?:reviews?|beoordelingen?)/i)
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1], 10) : null

    // Extract a chunk of text for sentiment analysis
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000)

    return { rating, reviewCount, rawText: textContent }
  } catch {
    return { rating: null, reviewCount: null, rawText: '' }
  }
}

export function iensRatingToScore(rating: number | null): number {
  if (rating === null) return 50 // neutral fallback
  // Iens uses 0-10 scale
  return Math.round((rating / 10) * 100)
}
