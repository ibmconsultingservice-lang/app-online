import { AuthProvider } from '@/hooks/useAuth'
import './globals.css'

export const metadata = {
  title: 'AIBusiness — Suite IA Business',
  description: 'Business plan, marketing, rapports propulsés par IA',
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