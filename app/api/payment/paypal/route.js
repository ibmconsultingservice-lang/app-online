import { NextResponse } from 'next/server'

const PAYPAL_CLIENT_ID     = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_MODE          = process.env.PAYPAL_MODE || 'sandbox'
const APP_URL              = process.env.NEXT_PUBLIC_APP_URL || 'https://app-online--aibusiness-ibm.us-central1.hosted.app'

const BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

// Get PayPal access token
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
    const { amount, plan, credits, userEmail, userId } = await request.json()

    // Convert CFA to USD
    const amountUSD = (parseInt(amount) / 620).toFixed(2)

    const accessToken = await getAccessToken()

    // Create PayPal order
    const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value:         amountUSD,
          },
          description: `Plan ${plan} - IA.Business - ${userEmail}`,
          custom_id:   JSON.stringify({ userId, plan, credits }),
        }],
        application_context: {
          brand_name:          'IA.Business',
          landing_page:        'BILLING',
          user_action:         'PAY_NOW',
          return_url: `${APP_URL}/pricing/carte/success?plan=${plan}&credits=${credits}&userId=${userId}`,
          cancel_url: `${APP_URL}/pricing/carte?plan=${plan}&credits=${credits}&price=${amount}`,
        },
      }),
    })

    const order = await res.json()
    const approveUrl = order.links?.find(l => l.rel === 'approve')?.href

    if (approveUrl) {
      return NextResponse.json({ paymentUrl: approveUrl, orderId: order.id })
    } else {
      throw new Error(order.message || 'Erreur PayPal')
    }

  } catch (error) {
    console.error('PayPal error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}