/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Pas de output: 'export' — SSR complet
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
}

export default nextConfig