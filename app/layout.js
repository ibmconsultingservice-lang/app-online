import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'

export const metadata = { title: 'AppOnline', description: 'AI Tools' }

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}