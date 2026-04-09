'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch extra data from Firestore (credits, name, etc.)
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setUser({ ...firebaseUser, ...snap.data() })
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // ── Register ──────────────────────────────────
  const register = async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })

    // Save user to Firestore with 10 free credits
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid:       cred.user.uid,
      name:      name,
      email:     email,
      credits:   10,
      createdAt: serverTimestamp(),
    })
    return cred.user
  }

  // ── Login ─────────────────────────────────────
  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return cred.user
  }

  // ── Google ────────────────────────────────────
  const loginGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const cred     = await signInWithPopup(auth, provider)

    // Create Firestore doc only if first time
    const snap = await getDoc(doc(db, 'users', cred.user.uid))
    if (!snap.exists()) {
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid:       cred.user.uid,
        name:      cred.user.displayName,
        email:     cred.user.email,
        credits:   10,
        createdAt: serverTimestamp(),
      })
    }
    return cred.user
  }

  // ── Logout ────────────────────────────────────
  const logout = async () => {
    await signOut(auth)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, loginGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}