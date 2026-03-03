import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { run_id, user_id, question_ids } = body

        if (!run_id || !user_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const n8nWebhookUrl = process.env.N8N_WEBHOOK_BASE_URL ? process.env.N8N_WEBHOOK_BASE_URL + '/generate' : ''
        if (!process.env.N8N_WEBHOOK_BASE_URL) {
            console.warn("N8N_WEBHOOK_BASE_URL is not set. Assuming direct call to FastAPI.")
            // Development mock: Direct API call if N8N isn't available
            const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
            const response = await fetch(`${backendUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ run_id, user_id, question_ids }),
            })
            if (!response.ok) {
                const errText = await response.text()
                console.error(`FastAPI /api/generate error (${response.status}):`, errText)
                throw new Error(`Backend error (${response.status}): ${errText}`)
            }

            const result = await response.json()
            return NextResponse.json(result)
        }

        // Call to n8n Webhook
        const n8nResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ run_id, user_id, question_ids }),
        })

        if (!n8nResponse.ok) {
            throw new Error(`n8n webhook failed with status: ${n8nResponse.status}`)
        }

        const result = await n8nResponse.json()
        return NextResponse.json(result)

    } catch (error: any) {
        console.error('Generate API proxy error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
