'use client'
import { useState, useEffect } from 'react'
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from './useAuth'

export function useCredits() {
  const { user } = useAuth()
  const [credits, setCredits] = useState(0)
  const [plan, setPlan]       = useState('starter')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setCredits(0)
      setPlan('starter')
      setLoading(false)
      return
    }
    const fetchData = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (snap.exists()) {
        const data = snap.data()
        setCredits(data.credits ?? 0)
        setPlan(data.plan ?? 'starter')
      }
      setLoading(false)
    }
    fetchData()
  }, [user])

  const deductCredit = async (amount = 1) => {
    if (!user) throw new Error('Non connecté')
    if (credits < amount) throw new Error('Crédits insuffisants')
    await updateDoc(doc(db, 'users', user.uid), {
      credits: increment(-amount)
    })
    setCredits(prev => prev - amount)
  }

  const getCredits = async () => {
    if (!user) return 0
    const snap = await getDoc(doc(db, 'users', user.uid))
    return snap.exists() ? snap.data().credits : 0
  }

  return { credits, plan, loading, deductCredit, getCredits }
}