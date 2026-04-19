'use client'

interface RestaurantPhotoProps {
  photoReference: string
  restaurantName: string
}

export default function RestaurantPhoto({ photoReference, restaurantName }: RestaurantPhotoProps) {
  const photoUrl = `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=800&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`

  return (
    <div className="w-full h-52 overflow-hidden border-b-[3px] border-inkBlack relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt={restaurantName}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.parentElement?.remove()
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  )
}
