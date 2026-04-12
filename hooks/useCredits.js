'use client'
import { useState, useEffect } from 'react'
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'

export function useCredits() {
  const { user }              = useAuth()
  const [credits, setCredits] = useState(0)
  const [plan, setPlan]       = useState('free')

  // ── Real-time listener on Firestore ──────────
  useEffect(() => {
    if (!user?.uid) return
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setCredits(data?.credits ?? 0)
        setPlan(data?.plan ?? 'free')
      }
    })
    return () => unsub()
  }, [user?.uid])

  const hasCredits = (cost = 1) => credits >= cost

  const deductCredits = async (cost = 1) => {
    if (!user?.uid) return false
    if (credits < cost) return false
    await updateDoc(doc(db, 'users', user.uid), {
      credits: increment(-cost)
    })
    // No need to manually update state — onSnapshot handles it automatically ✅
    return true
  }

  const addCredits = async (amount) => {
    if (!user?.uid) return
    await updateDoc(doc(db, 'users', user.uid), {
      credits: increment(amount)
    })
  }

  return { credits, plan, hasCredits, deductCredits, addCredits }
}