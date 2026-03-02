import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        // 1. Get files & user_id from form data
        const questionnaire = formData.get('questionnaire') as File
        const references = formData.getAll('references') as File[]
        const userId = formData.get('user_id') as string

        if (!questionnaire || references.length === 0 || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const n8nWebhookUrl = process.env.N8N_WEBHOOK_BASE_URL ? process.env.N8N_WEBHOOK_BASE_URL + '/parse-and-ingest' : ''
        if (!process.env.N8N_WEBHOOK_BASE_URL) {
            console.warn("N8N_WEBHOOK_BASE_URL is not set. Assuming direct call to FastAPI.")
            // Development fallback: proxy to FastAPI backend
            const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
            const backendFormData = new FormData()
            backendFormData.append('questionnaire', questionnaire)
            references.forEach(ref => backendFormData.append('references', ref))
            backendFormData.append('user_id', userId)

            const response = await fetch(`${backendUrl}/api/parse`, {
                method: 'POST',
                body: backendFormData,
            })
            if (!response.ok) throw new Error("Direct backend call failed")

            const result = await response.json()
            return NextResponse.json(result)
        }

        // 2. Prepare payload for n8n.
        // In a real scenario, you'd likely convert the files to base64, or use FormData
        // if the n8n webhook is configured to receive multipart/form-data.
        // For this implementation plan, we will assume n8n can handle multipart.

        // Create new FormData to send to n8n
        const n8nFormData = new FormData()
        n8nFormData.append('questionnaire', questionnaire)
        references.forEach(ref => n8nFormData.append('references', ref))
        n8nFormData.append('user_id', userId)

        // 3. Make the proxy call to n8n
        const n8nResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            body: n8nFormData,
            // Add custom auth header if required by your n8n setup:
            // headers: { 'X-API-Key': process.env.YOUR_SECRET }
        })

        if (!n8nResponse.ok) {
            throw new Error(`n8n webhook failed with status: ${n8nResponse.status}`)
        }

        // 4. Return result to frontend
        // n8n should respond with { run_id, question_count, chunks_created }
        const result = await n8nResponse.json()
        return NextResponse.json(result)

    } catch (error: any) {
        console.error('Parse API proxy error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
