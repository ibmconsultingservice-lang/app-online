/** @type {import('next').NextConfig} */
const nextConfig = {
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