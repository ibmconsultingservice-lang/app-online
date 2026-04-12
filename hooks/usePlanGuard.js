'use client'
import { useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

const PLAN_LEVELS = { free: 0, starter: 1, pro: 2, premium: 3 }

export function usePlanGuard(requiredPlan) {
  const { plan, credits } = useCredits()
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // ← Wait for auth AND plan to be loaded before checking
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    // ← Wait for plan to be initialized (not undefined/null)
    if (!plan) return

    if (PLAN_LEVELS[plan] < PLAN_LEVELS[requiredPlan]) {
      router.push('/pricing')
    }
  }, [plan, user, loading, requiredPlan])

  // Returns true if access is allowed
  return !loading && !!user && PLAN_LEVELS[plan] >= PLAN_LEVELS[requiredPlan]
}