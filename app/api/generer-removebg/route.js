export async function POST(request) {
  try {
    const formData = await request.formData()
    const image = formData.get('image')

    if (!image) {
      return Response.json({ error: 'No image provided' }, { status: 400 })
    }

    const PYTHON_API_URL = process.env.PYTHON_API_URL || 'https://removebg-api-production.up.railway.app'

    const proxyForm = new FormData()
    proxyForm.append('image', image)

    const res = await fetch(`${PYTHON_API_URL}/remove-bg`, {
      method: 'POST',
      body: proxyForm,
    })

    if (!res.ok) throw new Error('Python API error')

    const buffer = await res.arrayBuffer()

    return new Response(buffer, {
      headers: { 'Content-Type': 'image/png' },
    })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}