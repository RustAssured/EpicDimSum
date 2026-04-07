import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { Restaurant } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const filePath = path.join(process.cwd(), 'data', 'restaurants.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const restaurants: Restaurant[] = JSON.parse(raw)

  const restaurant = restaurants.find((r) => r.id === params.id)
  if (!restaurant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(restaurant)
}
