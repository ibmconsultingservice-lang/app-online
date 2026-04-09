'use client'
import { useState, useEffect } from 'react'
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'

export function useCredits() {
  const { user } = useAuth()
  const [credits, setCredits] = useState(null)

  useEffect(() => {
    if (!user?.uid) return
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setCredits(snap.data()?.credits ?? 0)
    })
    return () => unsub()
  }, [user?.uid])

  const deductCredit = async (amount = 1) => {
    if (!user?.uid) return
    await updateDoc(doc(db, 'users', user.uid), {
      credits: increment(-amount)
    })
  }

  const addCredits = async (amount) => {
    if (!user?.uid) return
    await updateDoc(doc(db, 'users', user.uid), {
      credits: increment(amount)
    })
  }

  return { credits, deductCredit, addCredits }
}