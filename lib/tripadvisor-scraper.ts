export interface TripadvisorData {
  rating: number | null
  reviewCount: number | null
  rawText: string
  dumplingMentions: number
  reviewTexts: string[]
}

const UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

const DUMPLING_KW = ['dim sum', 'ha gao', 'siu mai', 'dumpling', 'har gow', 'cheung fun']

export async function fetchTripadvisorData(
  restaurantName: string,
  city: string
): Promise<TripadvisorData> {
  const empty: TripadvisorData = {
    rating: null,
    reviewCount: null,
    rawText: '',
    dumplingMentions: 0,
    reviewTexts: [],
  }

  try {
    // Step 1: search (geo=188640 = Netherlands)
    const query = encodeURIComponent(`${restaurantName} ${city} dim sum`)
    const searchUrl = `https://www.tripadvisor.com/Search?q=${query}&geo=188640`

    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!searchRes.ok) return empty

    const searchHtml = await searchRes.text()

    // Find first restaurant page URL
    const restaurantUrlMatch = searchHtml.match(/href="(\/Restaurant_Review-[^"]+\.html)"/)

    if (!restaurantUrlMatch) {
      const text = searchHtml
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2000)
      const dumplingMentions = DUMPLING_KW.reduce(
        (n, kw) => n + (text.toLowerCase().split(kw).length - 1),
        0
      )
      return { ...empty, rawText: text, dumplingMentions }
    }

    // Step 2: fetch restaurant page (polite delay)
    await new Promise((r) => setTimeout(r, 1500))

    const restaurantUrl = `https://www.tripadvisor.com${restaurantUrlMatch[1]}`
    const pageRes = await fetch(restaurantUrl, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!pageRes.ok) return empty

    const pageHtml = await pageRes.text()

    // Rating + review count from JSON-LD / meta
    const ratingMatch = pageHtml.match(/"ratingValue"\s*:\s*"?(\d+\.?\d*)"?/)
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

    const reviewCountMatch = pageHtml.match(/"reviewCount"\s*:\s*"?(\d+)"?/)
    const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1]) : null

    const reviewTexts: string[] = []

    // JSON-LD structured reviews
    const jsonLdMatches =
      pageHtml.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) ?? []
    for (const script of jsonLdMatches) {
      try {
        const jsonStr = script.replace(/<script[^>]*>|<\/script>/gi, '').trim()
        const json = JSON.parse(jsonStr)
        const graphs = Array.isArray(json['@graph']) ? json['@graph'] : [json]
        for (const item of graphs) {
          const reviews = Array.isArray(item.review) ? item.review : []
          for (const rev of reviews.slice(0, 10)) {
            const text: string = rev.reviewBody ?? rev.description ?? ''
            if (text.length > 20) reviewTexts.push(text)
          }
        }
      } catch { /* skip */ }
    }

    // HTML pattern fallback: data-test-target="review-body" or similar
    if (reviewTexts.length < 3) {
      const htmlReviews =
        pageHtml.match(/data-test-target="review-body"[^>]*>([\s\S]{20,600}?)<\/span>/g) ?? []
      for (const block of htmlReviews.slice(0, 8)) {
        const text = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (text.length > 20 && !reviewTexts.includes(text)) reviewTexts.push(text)
      }
    }

    // Generic paragraph fallback
    if (reviewTexts.length < 2) {
      const paragraphs =
        pageHtml.match(/<p[^>]*class="[^"]*(?:review|partial_entry|entry)[^"]*"[^>]*>([\s\S]{20,500}?)<\/p>/gi) ?? []
      for (const p of paragraphs.slice(0, 8)) {
        const text = p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (text.length > 20 && !reviewTexts.includes(text)) reviewTexts.push(text)
      }
    }

    const rawText = pageHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000)

    const dumplingMentions = DUMPLING_KW.reduce(
      (n, kw) => n + (rawText.toLowerCase().split(kw).length - 1),
      0
    )

    return { rating, reviewCount, rawText, dumplingMentions, reviewTexts }
  } catch {
    return empty
  }
}
