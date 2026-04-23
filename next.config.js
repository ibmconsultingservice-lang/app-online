/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['firebase-admin'],  // ← dit à Next.js de ne pas bundler firebase-admin

  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: `https://aibusiness-ibm.firebaseapp.com/__/auth/:path*`,
      },
    ]
  },
}

module.exports = nextConfig