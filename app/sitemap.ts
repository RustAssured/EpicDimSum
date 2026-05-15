import type { MetadataRoute } from 'next'
import { getAllRestaurantsAdmin } from '@/lib/db'

const BASE = 'https://epicdimsum.nl'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let restaurantRoutes: MetadataRoute.Sitemap = []
  try {
    const all = await getAllRestaurantsAdmin()
    restaurantRoutes = all
      .filter((r) => r.verified === true)
      .map((r) => ({
        url: `${BASE}/restaurant/${r.id}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        lastModified: new Date(),
      }))
  } catch {
    // fallback: sitemap still works without restaurant routes
  }

  return [
    { url: BASE, changeFrequency: 'daily', priority: 1.0, lastModified: new Date() },
    { url: `${BASE}/reis`, changeFrequency: 'weekly', priority: 0.8, lastModified: new Date() },
    { url: `${BASE}/stad/amsterdam`, changeFrequency: 'daily', priority: 0.9, lastModified: new Date() },
    { url: `${BASE}/stad/rotterdam`, changeFrequency: 'daily', priority: 0.9, lastModified: new Date() },
    { url: `${BASE}/stad/den-haag`, changeFrequency: 'daily', priority: 0.9, lastModified: new Date() },
    { url: `${BASE}/stad/utrecht`, changeFrequency: 'daily', priority: 0.9, lastModified: new Date() },
    { url: `${BASE}/privacy`, changeFrequency: 'yearly', priority: 0.3, lastModified: new Date() },
    ...restaurantRoutes,
  ]
}
