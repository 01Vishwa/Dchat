'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import QATable, { QAPair } from '@/components/QATable'
import CoverageSummary from '@/components/CoverageSummary'

export default function ReviewPage() {
    const { runId } = useParams()
    const router = useRouter()
    const supabase = createSupabaseBrowserClient()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [run, setRun] = useState<any>(null)
    const [qaPairs, setQaPairs] = useState<QAPair[]>([])

    useEffect(() => {
        fetchData()
    }, [runId])

    const fetchData = async () => {
        try {
            const { data: runData, error: runError } = await supabase
                .from('runs')
                .select('*')
                .eq('id', runId)
                .single()

            if (runError) throw runError
            setRun(runData)

            const { data: qaData, error: qaError } = await supabase
                .from('qa_pairs')
                .select('*')
                .eq('run_id', runId)
                .order('question_number', { ascending: true })

            if (qaError) throw qaError
            setQaPairs(qaData)

            // If it's pending, trigger generation
            if (runData.status === 'pending') {
                triggerGeneration()
            } else {
                setLoading(false)
            }

        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    const triggerGeneration = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    run_id: runId,
                    user_id: user?.id
                })
            })

            if (!response.ok) throw new Error('Generation failed')

            // Re-fetch data after generation completes (non-recursive)
            const { data: runData, error: runError } = await supabase
                .from('runs')
                .select('*')
                .eq('id', runId)
                .single()

            if (runError) throw runError
            setRun(runData)

            const { data: qaData, error: qaError } = await supabase
                .from('qa_pairs')
                .select('*')
                .eq('run_id', runId)
                .order('question_number', { ascending: true })

            if (qaError) throw qaError
            setQaPairs(qaData)
            setLoading(false)

        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    const handleSaveEdit = async (id: string, newAnswer: string) => {
        try {
            const { error } = await supabase
                .from('qa_pairs')
                .update({ edited_answer: newAnswer })
                .eq('id', id)

            if (error) throw error

            // Update local state
            setQaPairs(prev => prev.map(qa =>
                qa.id === id ? { ...qa, edited_answer: newAnswer } : qa
            ))
        } catch (err: any) {
            alert(`Failed to save: ${err.message}`)
        }
    }

    const handleExport = async () => {
        try {
            // Create a form programmatically to submit and trigger a file download
            const form = document.createElement('form')
            form.method = 'POST'
            form.action = '/api/export'

            const input = document.createElement('input')
            input.type = 'hidden'
            input.name = 'run_id'
            input.value = runId as string

            form.appendChild(input)
            document.body.appendChild(form)
            form.submit()
            document.body.removeChild(form)

        } catch (err: any) {
            alert(`Export failed: ${err.message}`)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 font-medium text-lg">Generating answers based on your references...</p>
                <p className="text-gray-400 text-sm mt-2">This may take a minute or two.</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-red-50 text-red-700 p-6 rounded-md border border-red-200">
                    <h2 className="text-lg font-bold mb-2">Error</h2>
                    <p>{error}</p>
                    <button
                        onClick={() => router.push('/upload')}
                        className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    // Calculate stats for summary component
    const avgConfidence = qaPairs.length > 0
        ? qaPairs.reduce((acc, qa) => acc + qa.confidence, 0) / qaPairs.length
        : 0;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Review Answers</h1>
                    <p className="text-sm text-gray-500">
                        For document: <span className="font-medium text-gray-700">{run?.questionnaire_filename}</span>
                    </p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Back to Dashboard
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                        Export DOCX
                    </button>
                </div>
            </div>

            <CoverageSummary
                total={run?.total_questions || 0}
                answered={run?.answered_count || 0}
                notFound={run?.not_found_count || 0}
                avgConfidence={avgConfidence}
            />

            <QATable
                qaPairs={qaPairs}
                onSaveEdit={handleSaveEdit}
            />
        </div>
    )
}
