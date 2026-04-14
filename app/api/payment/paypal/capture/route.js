import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'

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

    const accessToken = await getAccessToken()

    // Capture the payment
    const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    const capture = await res.json()

    if (capture.status === 'COMPLETED') {
      // ── Activate plan in Firestore ──
      await updateDoc(doc(db, 'users', userId), {
        plan:    plan,
        credits: PLAN_CREDITS[plan] || 50,
      })

      return NextResponse.json({ success: true, status: 'COMPLETED' })
    } else {
      throw new Error('Payment not completed: ' + capture.status)
    }

  } catch (error) {
    console.error('Capture error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}