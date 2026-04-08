export interface BuzzResult {
  blogMentions: number
  tiktokMentions: number
  totalBuzzScore: number // 0-100
  sources: string[]
}

// Curated list of Dutch food blog RSS feeds
const NL_FOOD_BLOG_FEEDS = [
  'https://www.missfoodie.nl/feed/',
  'https://www.foodlog.nl/feed/',
  'https://www.eatlife.nl/feed/',
  'https://www.foodinista.nl/feed/',
  'https://www.leukerecepten.nl/feed/',
]

async function fetchRssFeed(url: string, restaurantName: string): Promise<number> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EpicDimSum/1.0 RSS Reader' },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
    if (!res.ok) return 0

    const xml = await res.text()
    const name = restaurantName.toLowerCase()

    // Count items where title or description mentions the restaurant
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
    let count = 0
    let match: RegExpExecArray | null
    while ((match = itemRegex.exec(xml)) !== null) {
      if (match[1].toLowerCase().includes(name)) count++
    }
    return count
  } catch {
    return 0
  }
}

async function fetchTikTokMentions(restaurantName: string, city: string): Promise<number> {
  try {
    const query = encodeURIComponent(`${restaurantName} ${city} dimsum`)
    const url = `https://www.tiktok.com/search?q=${query}`

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })

    if (!res.ok) return 0

    const html = await res.text()

    // Look for video count indicators in the response
    const videoCountMatch = html.match(/"videoCount"\s*:\s*(\d+)/i)
    if (videoCountMatch) return Math.min(parseInt(videoCountMatch[1], 10), 999)

    // Fallback: count occurrences of the restaurant name in the response
    const name = restaurantName.toLowerCase()
    const occurrences = (html.toLowerCase().match(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length
    return Math.min(occurrences, 50)
  } catch {
    return 0
  }
}

export async function computeBuzzScore(
  restaurantName: string,
  city: string,
  existingBlogMentions = 0
): Promise<BuzzResult> {
  // Fetch all RSS feeds in parallel
  const rssResults = await Promise.all(
    NL_FOOD_BLOG_FEEDS.map((feed) => fetchRssFeed(feed, restaurantName))
  )
  const blogMentions = rssResults.reduce((sum, n) => sum + n, 0) + existingBlogMentions

  // Fetch TikTok
  const tiktokMentions = await fetchTikTokMentions(restaurantName, city)

  // Compute normalized buzz score 0-100
  // Blog mentions: each mention worth up to ~5 points, cap at 20 mentions = 100
  const blogScore = Math.min((blogMentions / 20) * 60, 60)
  // TikTok: up to 40 points for 50+ mentions
  const tiktokScore = Math.min((tiktokMentions / 50) * 40, 40)
  const totalBuzzScore = Math.round(blogScore + tiktokScore)

  const sources = NL_FOOD_BLOG_FEEDS.filter((_, i) => rssResults[i] > 0)
  if (tiktokMentions > 0) sources.push('TikTok')

  return { blogMentions, tiktokMentions, totalBuzzScore, sources }
}
