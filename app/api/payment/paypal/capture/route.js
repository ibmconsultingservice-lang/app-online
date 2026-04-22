import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// ── Firebase Admin init (singleton) ──────────────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Replace escaped newlines in the private key (common env var issue)
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const adminDb = getFirestore()

// ── PayPal config ─────────────────────────────────────────────────────────────
const PAYPAL_CLIENT_ID     = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_MODE          = process.env.PAYPAL_MODE || 'sandbox'

const BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const PLAN_CREDITS = { starter: 50, pro: 150, premium: 500 }
const PLAN_LEVELS  = { free: 0, starter: 1, pro: 2, premium: 3 }

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
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // ── 1. Get PayPal access token ────────────────────────────────────────────
    const accessToken = await getAccessToken()

    // ── 2. Capture the PayPal order ───────────────────────────────────────────
    const captureRes = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    const capture = await captureRes.json()

    // Handle already-captured orders gracefully
    if (
      capture.status !== 'COMPLETED' &&
      capture?.details?.[0]?.issue !== 'ORDER_ALREADY_CAPTURED'
    ) {
      throw new Error('Paiement non complété : ' + (capture.status || JSON.stringify(capture.details)))
    }

    // ── 3. Read current user from Firestore (Admin SDK — no permission issues) ─
    const userRef  = adminDb.collection('users').doc(userId)
    const userSnap = await userRef.get()

    let currentCredits = 0
    let currentPlan    = 'free'

    if (userSnap.exists) {
      const data     = userSnap.data()
      currentCredits = data.credits ?? 0
      currentPlan    = data.plan    ?? 'free'
    }

    // ── 4. Determine upgraded plan (never downgrade) ───────────────────────────
    const newPlanLevel     = PLAN_LEVELS[plan]        ?? 0
    const currentPlanLevel = PLAN_LEVELS[currentPlan] ?? 0
    const upgradedPlan     = newPlanLevel > currentPlanLevel ? plan : currentPlan

    // ── 5. Cumulate credits ────────────────────────────────────────────────────
    const creditsToAdd = PLAN_CREDITS[plan] ?? 50
    const newCredits   = currentCredits + creditsToAdd

    // ── 6. Write to Firestore via Admin SDK ───────────────────────────────────
    await userRef.update({
      plan:      upgradedPlan,
      credits:   newCredits,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success:     true,
      status:      'COMPLETED',
      plan:        upgradedPlan,
      credits:     newCredits,
      creditsAdded: creditsToAdd,
    })

  } catch (error) {
    console.error('[paypal/capture] error:', error.message)

    // Let the client know if it was already captured (idempotent)
    if (error.message?.includes('ORDER_ALREADY_CAPTURED')) {
      return NextResponse.json({ success: true, error: 'ORDER_ALREADY_CAPTURED' })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}