/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['firebase-admin'],

  async headers() {
    return [
      {
        // COEP/COOP uniquement sur /videditor — ne casse pas Firebase Auth ailleurs
        source: '/videditor',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',  value: 'same-origin'  },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/videditor/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',  value: 'same-origin'  },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ]
  },

  async rewrites() {
    return [
      {
        source:      '/__/auth/:path*',
        destination: 'https://aibusiness-ibm.firebaseapp.com/__/auth/:path*',
      },
    ]
  },
}

module.exports = nextConfig