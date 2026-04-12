/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['node-html-parser'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
  },
}

export default nextConfig
