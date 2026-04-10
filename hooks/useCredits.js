'use client'
import { useAuth } from './useAuth'
import { doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function useCredits() {
  const { user, profile, refreshProfile } = useAuth()

  const hasCredits = (cost = 1) => (profile?.credits || 0) >= cost

  const deductCredits = async (cost = 1) => {
    if (!user || !hasCredits(cost)) return false
    await updateDoc(doc(db, 'users', user.uid), {
      credits: increment(-cost),
    })
    await refreshProfile()
    return true
  }

  return {
    credits:      profile?.credits || 0,
    plan:         profile?.plan    || 'free',
    hasCredits,
    deductCredits,
  }
}