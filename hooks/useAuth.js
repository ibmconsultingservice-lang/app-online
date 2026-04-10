'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const ref  = doc(db, 'users', u.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          setProfile(snap.data())
        } else {
          const newProfile = {
            name:      u.displayName || '',
            email:     u.email,
            plan:      'free',
            credits:   10,
            createdAt: serverTimestamp(),
          }
          await setDoc(ref, newProfile)
          setProfile(newProfile)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
  }, [])

  const register = async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const newProfile = {
      name, email,
      plan: 'free', credits: 10,
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(db, 'users', cred.user.uid), newProfile)
    setProfile(newProfile)
    return cred
  }

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const loginGoogle = () =>
    signInWithPopup(auth, new GoogleAuthProvider())

  const logout = () => signOut(auth)

  const refreshProfile = async () => {
    if (!user) return
    const snap = await getDoc(doc(db, 'users', user.uid))
    if (snap.exists()) setProfile(snap.data())
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      register, login, loginGoogle, logout, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)