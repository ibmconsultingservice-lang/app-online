import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore'

const PAYPAL_CLIENT_ID     = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_MODE          = process.env.PAYPAL_MODE || 'sandbox'

const BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const PLAN_CREDITS = { starter: 50, pro: 150, premium: 500 }

async function getAccessToken() {
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  return data.access_token
}

export async function POST(request) {
  try {
    const { orderId, userId, plan } = await request.json()

    if (!orderId || !userId || !plan) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // ── 1. Vérifier si l'ordre n'a pas déjà été traité (idempotence) ──
    const userRef  = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      const data = userSnap.data()
      // Si cet orderId a déjà été traité → renvoie succès sans re-capturer
      if (data.lastOrderId === orderId) {
        console.log('⚠️ Ordre déjà traité:', orderId)
        return NextResponse.json({ success: true, status: 'ALREADY_PROCESSED' })
      }
    }

    // ── 2. Récupérer le token PayPal ──
    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('Impossible d\'obtenir le token PayPal')
    }

    // ── 3. Capturer le paiement ──
    const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    const capture = await res.json()
    console.log('PayPal capture response:', JSON.stringify(capture))

    // ── 4. Gérer les cas de succès (COMPLETED ou déjà capturé) ──
    const alreadyCaptured =
      capture.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED' ||
      capture.status === 'ALREADY_CAPTURED'

    if (capture.status === 'COMPLETED' || alreadyCaptured) {
      const creditsToAdd = PLAN_CREDITS[plan] || 50

      // ── 5. Mettre à jour Firestore avec increment (pas d'écrasement) ──
      await updateDoc(userRef, {
        plan:         plan,
        credits:      increment(creditsToAdd), // ✅ additionne les crédits existants
        lastOrderId:  orderId,                 // ✅ idempotence : évite double attribution
        planActivatedAt: new Date().toISOString(),
      })

      console.log(`✅ Plan ${plan} activé pour ${userId} (+${creditsToAdd} crédits)`)
      return NextResponse.json({ success: true, status: 'COMPLETED', creditsAdded: creditsToAdd })
    } else {
      console.error('❌ PayPal status inattendu:', capture)
      throw new Error('Paiement non complété: ' + (capture.status || JSON.stringify(capture.details)))
    }

  } catch (error) {
    console.error('Capture error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}