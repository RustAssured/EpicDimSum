import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { Restaurant } from '@/lib/types'

export const revalidate = 3600 // 1 hour ISR

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')

  const filePath = path.join(process.cwd(), 'data', 'restaurants.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  let restaurants: Restaurant[] = JSON.parse(raw)

  if (city && city !== 'Alle') {
    restaurants = restaurants.filter((r) => r.city === city)
  }

  return NextResponse.json(restaurants)
}
