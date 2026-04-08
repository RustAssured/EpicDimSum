export interface TripadvisorData {
  rating: number | null
  reviewCount: number | null
  rawText: string
  dumplingMentions: number
}

export async function fetchTripadvisorData(restaurantName: string, city: string): Promise<TripadvisorData> {
  const query = encodeURIComponent(`${restaurantName} ${city} dim sum`)
  const searchUrl = `https://www.tripadvisor.com/Search?q=${query}&searchSessionId=&geo=`

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EpicDimSum/1.0; +https://epicdimsum.nl)',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return { rating: null, reviewCount: null, rawText: '', dumplingMentions: 0 }

    const html = await res.text()

    const ratingMatch = html.match(/"ratingValue"\s*:\s*"?(\d+\.?\d*)"?/)
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

    const reviewMatch = html.match(/"reviewCount"\s*:\s*"?(\d+)"?/)
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : null

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000)

    const dumplingKeywords = ['dim sum', 'ha gao', 'siu mai', 'dumpling', 'har gow', 'cheung fun']
    const dumplingMentions = dumplingKeywords.reduce((count, kw) => {
      const matches = text.toLowerCase().split(kw).length - 1
      return count + matches
    }, 0)

    return { rating, reviewCount, rawText: text, dumplingMentions }
  } catch {
    return { rating: null, reviewCount: null, rawText: '', dumplingMentions: 0 }
  }
}
