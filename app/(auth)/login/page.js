'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const { login, loginGoogle } = useAuth()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      router.push('/dashboard') // ← fine for email login
    } catch (err) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      await loginGoogle()
      // ← NO router.push here
      // useAuth handles redirect via window.location.href after getRedirectResult
    } catch (err) {
      setError('Erreur connexion Google')
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight:'100vh', background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:20, fontFamily:'Inter,-apple-system,sans-serif'
    }}>
      <div style={{
        background:'#fff', borderRadius:24, padding:40,
        width:420, maxWidth:'100%',
        boxShadow:'0 25px 50px rgba(0,0,0,0.15)'
      }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{
            width:56, height:56, background:'#534AB7', borderRadius:16,
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 12px', fontSize:24
          }}>⚡</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:0 }}>AIBusiness</h1>
          <p style={{ color:'#64748b', fontSize:14, marginTop:4 }}>Connectez-vous à votre compte</p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width:'100%', background:'#fff', color:'#374151',
            border:'1px solid #e2e8f0', borderRadius:12,
            padding:'11px 0', fontSize:14, fontWeight:600,
            cursor:'pointer', display:'flex', alignItems:'center',
            justifyContent:'center', gap:10, marginBottom:20,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Redirection...' : 'Continuer avec Google'}
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <div style={{ flex:1, height:1, background:'#e2e8f0' }}/>
          <span style={{ fontSize:12, color:'#94a3b8' }}>ou</span>
          <div style={{ flex:1, height:1, background:'#e2e8f0' }}/>
        </div>

        <form onSubmit={handleLogin}>
          <label style={lStyle}>Email</label>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            required style={iStyle}
          />

          <label style={lStyle}>Mot de passe</label>
          <input
            type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required style={iStyle}
          />

          {error && (
            <div style={{
              background:'#fee2e2', color:'#ef4444', borderRadius:8,
              padding:'10px 14px', fontSize:13, marginBottom:16
            }}>{error}</div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width:'100%', background: loading ? '#94a3b8' : '#534AB7',
              color:'white', border:'none', borderRadius:12,
              padding:'13px 0', fontSize:14, fontWeight:700,
              cursor: loading ? 'not-allowed' : 'pointer', marginTop:4
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#64748b' }}>
          Pas de compte ?{' '}
          <Link href="/register" style={{ color:'#534AB7', fontWeight:600, textDecoration:'none' }}>
            S'inscrire gratuitement
          </Link>
        </p>
      </div>
    </main>
  )
}

const lStyle = { fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:5, marginTop:14 }
const iStyle = { width:'100%', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 12px', fontSize:13, color:'#0f172a', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }