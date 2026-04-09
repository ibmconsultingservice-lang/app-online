'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', fontFamily:'Inter,sans-serif'
    }}>
      <div style={{ textAlign:'center' }}>
        <div style={{
          width:40, height:40,
          border:'3px solid #e2e8f0',
          borderTop:'3px solid #534AB7',
          borderRadius:'50%',
          animation:'spin 0.8s linear infinite',
          margin:'0 auto 16px'
        }}/>
        <p style={{ color:'#64748b', fontSize:14 }}>Chargement...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!user) return null
  return children
}