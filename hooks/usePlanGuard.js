'use client'
import { useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

const PLAN_LEVELS = { free: 0, starter: 1, pro: 2, premium: 3 }

export function usePlanGuard(requiredPlan) {
  const { plan } = useCredits()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // ← Still loading auth — do nothing
    if (authLoading) return

    // ← Auth loaded but no user → login
    if (!user) {
      router.push('/login')
      return
    }

    // ← Plan not yet loaded from Firestore → wait
    if (plan === null) return

    // ← Plan loaded → check access
    if (PLAN_LEVELS[plan] < PLAN_LEVELS[requiredPlan]) {
      router.push('/pricing')
    }
  }, [plan, user, authLoading, requiredPlan])

  // Still loading — return false to show loading state
  if (authLoading || !user || plan === null) return false

  return PLAN_LEVELS[plan] >= PLAN_LEVELS[requiredPlan]
}