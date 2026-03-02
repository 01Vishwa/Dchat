import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const run_id = formData.get('run_id') as string

        if (!run_id) {
            return NextResponse.json(
                { error: 'Missing run_id' },
                { status: 400 }
            )
        }

        const n8nWebhookUrl = process.env.N8N_WEBHOOK_BASE_URL ? process.env.N8N_WEBHOOK_BASE_URL + '/export' : ''
        if (!process.env.N8N_WEBHOOK_BASE_URL) {
            console.warn("N8N_WEBHOOK_BASE_URL is not set. Assuming direct call to FastAPI.")
            // Development mock: Direct API call if N8N isn't available
            const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
            const response = await fetch(`${backendUrl}/api/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ run_id }),
            })
            if (!response.ok) throw new Error("Direct backend export failed")

            const blob = await response.blob()
            return new NextResponse(blob, {
                status: 200,
                headers: {
                    'Content-Type': response.headers.get('Content-Type') || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'Content-Disposition': response.headers.get('Content-Disposition') || `attachment; filename="export_${run_id.substring(0, 8)}.docx"`,
                }
            })
        }

        // Call to n8n Webhook
        const n8nResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ run_id }),
        })

        if (!n8nResponse.ok) {
            throw new Error(`n8n webhook failed with status: ${n8nResponse.status}`)
        }

        const blob = await n8nResponse.blob()
        return new NextResponse(blob, {
            status: 200,
            headers: {
                'Content-Type': n8nResponse.headers.get('Content-Type') || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': n8nResponse.headers.get('Content-Disposition') || `attachment; filename="export_${run_id.substring(0, 8)}.docx"`,
            }
        })

    } catch (error: any) {
        console.error('Export API proxy error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
