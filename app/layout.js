import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'

export const metadata = {
  title: 'IA Business',
  description: 'Outils IA pour professionnels',
}

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