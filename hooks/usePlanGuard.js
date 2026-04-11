'use client'
import { useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { useRouter } from 'next/navigation'

const PLAN_LEVELS = { free: 0, starter: 1, pro: 2, premium: 3 }

export function usePlanGuard(requiredPlan) {
  const { plan } = useCredits()
  const router   = useRouter()

  useEffect(() => {
    if (!plan) return
    if (PLAN_LEVELS[plan] < PLAN_LEVELS[requiredPlan]) {
      router.push('/pricing')
    }
  }, [plan, requiredPlan])

  return PLAN_LEVELS[plan] >= PLAN_LEVELS[requiredPlan]
}