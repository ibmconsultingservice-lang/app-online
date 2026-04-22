import { NextResponse } from 'next/server'

// ── Firebase Admin — lazy singleton (works in Edge + Node runtimes) ──
let adminDb = null

async function getAdminDb() {
  if (adminDb) return adminDb

  const { initializeApp, getApps, cert } = await import('firebase-admin/app')
  const { getFirestore } = await import('firebase-admin/firestore')

  if (!getApps().length) {
    const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase Admin env vars missing. Set FIREBASE_ADMIN_PROJECT_ID, ' +
        'FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY in .env.local ' +
        'and as Firebase secrets in production.'
      )
    }

    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  }

  adminDb = getFirestore()
  return adminDb
}

// ── PayPal config ──
const PAYPAL_CLIENT_ID     = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_MODE          = process.env.PAYPAL_MODE || 'sandbox'
const BASE_URL             = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const PLAN_CREDITS = { starter: 50,  pro: 150, premium: 500 }
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
  if (!data.access_token) throw new Error('PayPal auth failed: ' + JSON.stringify(data))
  return data.access_token
}

export async function POST(request) {
  try {
    const { orderId, userId, plan } = await request.json()

    if (!orderId || !userId || !plan) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // ── 1. PayPal capture ──
    const accessToken = await getAccessToken()
    const captureRes  = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    const capture = await captureRes.json()

    const alreadyCaptured = capture?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED'
    if (capture.status !== 'COMPLETED' && !alreadyCaptured) {
      throw new Error('Paiement non complété : ' + (capture.status || JSON.stringify(capture.details)))
    }

    // ── 2. Firestore read via Admin ──
    const db      = await getAdminDb()
    const userRef = db.collection('users').doc(userId)
    const snap    = await userRef.get()

    let currentCredits = 0
    let currentPlan    = 'free'

    if (snap.exists) {
      const data     = snap.data()
      currentCredits = typeof data.credits === 'number' ? data.credits : 0
      currentPlan    = data.plan || 'free'
    }

    // ── 3. No-downgrade plan logic ──
    const upgradedPlan = (PLAN_LEVELS[plan] ?? 0) > (PLAN_LEVELS[currentPlan] ?? 0)
      ? plan
      : currentPlan

    // ── 4. Cumulate credits ──
    const creditsToAdd = PLAN_CREDITS[plan] ?? 50
    const newCredits   = currentCredits + creditsToAdd

    // ── 5. Write to Firestore ──
    await userRef.set({
      plan:      upgradedPlan,
      credits:   newCredits,
      updatedAt: new Date().toISOString(),
    }, { merge: true }) // merge:true so other user fields are never overwritten

    console.log(`[paypal/capture] ✓ userId=${userId} plan=${upgradedPlan} credits=${newCredits} (+${creditsToAdd})`)

    return NextResponse.json({
      success:      true,
      status:       'COMPLETED',
      plan:         upgradedPlan,
      credits:      newCredits,
      creditsAdded: creditsToAdd,
      previousPlan: currentPlan,
    })

  } catch (error) {
    console.error('[paypal/capture] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}