'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)  // ← Firestore data
  const [loading, setLoading] = useState(true)

  // ── Load Firestore profile ────────────────────
  const loadProfile = async (firebaseUser) => {
    if (!firebaseUser) return null
    const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
    return snap.exists() ? snap.data() : null
  }

  // ── Refresh profile (called after credit deduct) ──
  const refreshProfile = async () => {
    if (!user) return
    const data = await loadProfile(user)
    setProfile(data)
    setUser(prev => ({ ...prev, ...data }))
  }

  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        console.log('getRedirectResult:', result)   // ← add this
        if (!result) {
          console.log('No redirect result — normal page load')
          return
        }
        const u = result.user
        console.log('Google user:', u.uid, u.email)  // ← add this
        
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (!snap.exists()) {
          await setDoc(doc(db, 'users', u.uid), {
            uid:       u.uid,
            name:      u.displayName,
            email:     u.email,
            credits:   10,
            plan:      'free',
            createdAt: serverTimestamp(),
          })
        }
        window.location.href = '/dashboard'
      })
      .catch((err) => {
        console.error('getRedirectResult ERROR:', err.code, err.message)  // ← add this
      })
  

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const data = await loadProfile(firebaseUser)
          setProfile(data)
          setUser({ ...firebaseUser, ...data })
        } catch (err) {
          console.error('Firestore error:', err)
          setUser(firebaseUser)
          setProfile(null)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const register = async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    const data = {
      uid:       cred.user.uid,
      name:      name,
      email:     email,
      credits:   10,
      plan:      'free',
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(db, 'users', cred.user.uid), data)
    setProfile(data)
    return cred.user
  }

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return cred.user
  }

  const loginGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithRedirect(auth, provider)
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      refreshProfile,
      register,
      login,
      loginGoogle,
      logout,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}