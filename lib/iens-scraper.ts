export interface IensData {
  rating: number | null
  reviewCount: number | null
  rawText: string
  reviewTexts: string[]
}

const UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

export async function fetchIensData(restaurantName: string, city: string): Promise<IensData> {
  const empty: IensData = { rating: null, reviewCount: null, rawText: '', reviewTexts: [] }

  try {
    // Step 1: search page
    const query = encodeURIComponent(`${restaurantName} ${city}`)
    const searchUrl = `https://www.iens.nl/search?q=${query}`

    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html',
        'Accept-Language': 'nl-NL,nl;q=0.9',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    if (!searchRes.ok) return empty

    const searchHtml = await searchRes.text()

    // Find first restaurant page URL in search results
    const urlMatch = searchHtml.match(/href="(\/restaurant\/[^"?#]+)"/)

    if (!urlMatch) {
      // Fall back: extract raw text from the search page itself
      const rawText = searchHtml
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2000)
      return { ...empty, rawText }
    }

    // Step 2: fetch the restaurant page (polite delay)
    await new Promise((r) => setTimeout(r, 1000))

    const restaurantUrl = `https://www.iens.nl${urlMatch[1]}`
    const pageRes = await fetch(restaurantUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html',
        'Accept-Language': 'nl-NL,nl;q=0.9',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    if (!pageRes.ok) return empty

    const pageHtml = await pageRes.text()

    // Rating: "8.5" or "8,5" in rating context
    const ratingMatch = pageHtml.match(/(?:score|rating|cijfer)[^>]*>[\s]*([0-9][,\.][0-9])/i)
    const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : null

    // Review count
    const reviewMatch = pageHtml.match(/(\d+)\s*(?:reviews?|beoordelingen?)/i)
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1], 10) : null

    const reviewTexts: string[] = []

    // JSON-LD structured data (highest quality)
    const jsonLdMatches = pageHtml.match(
      /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    ) ?? []
    for (const script of jsonLdMatches) {
      try {
        const jsonStr = script.replace(/<script[^>]*>|<\/script>/gi, '').trim()
        const json = JSON.parse(jsonStr)
        const items = Array.isArray(json) ? json : [json]
        for (const item of items) {
          const reviews = item.review ?? item['@graph']?.flatMap(
            (g: { review?: { reviewBody?: string; description?: string }[] }) => g.review ?? []
          ) ?? []
          if (Array.isArray(reviews)) {
            for (const rev of reviews.slice(0, 8)) {
              const text: string = rev.reviewBody ?? rev.description ?? ''
              if (text.length > 20) reviewTexts.push(text)
            }
          }
        }
      } catch { /* skip malformed */ }
    }

    // HTML fallback: <p> or <div> blocks with review-like classes
    if (reviewTexts.length < 3) {
      const reviewBlocks =
        pageHtml.match(
          /<(?:p|div|span)[^>]*class="[^"]*(?:review|comment|text|body)[^"]*"[^>]*>([\s\S]{20,500}?)<\/(?:p|div|span)>/gi
        ) ?? []
      for (const block of reviewBlocks.slice(0, 10)) {
        const text = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (text.length > 20 && !reviewTexts.includes(text)) reviewTexts.push(text)
      }
    }

    const rawText = pageHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000)

    return { rating, reviewCount, rawText, reviewTexts }
  } catch {
    return empty
  }
}

export function iensRatingToScore(rating: number | null): number {
  if (rating === null) return 50
  return Math.round((rating / 10) * 100)
}
