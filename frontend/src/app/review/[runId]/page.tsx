'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import QATable, { QAPair } from '@/components/QATable'
import CoverageSummary from '@/components/CoverageSummary'
import QuestionNav, { useActiveQuestion } from '@/components/QuestionNav'

export default function ReviewPage() {
    const { runId } = useParams()
    const router = useRouter()
    const supabase = createSupabaseBrowserClient()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [run, setRun] = useState<any>(null)
    const [qaPairs, setQaPairs] = useState<QAPair[]>([])
    const [exporting, setExporting] = useState(false)
    const [regenerating, setRegenerating] = useState(false)
    const [viewMode, setViewMode] = useState<'all' | 'single'>('all')

    // Must call hooks unconditionally (before any early returns)
    const { activeQuestionNumber, setActiveQuestionNumber, scrollToQuestion } = useActiveQuestion(qaPairs);

    useEffect(() => {
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
                    await triggerGeneration()
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

        fetchData()
    }, [runId, supabase])

    const handleSaveEdit = async (id: string, newAnswer: string) => {
        try {
            const { error } = await supabase
                .from('qa_pairs')
                .update({ edited_answer: newAnswer })
                .eq('id', id)

            if (error) throw error

            setQaPairs(prev => prev.map(qa =>
                qa.id === id ? { ...qa, edited_answer: newAnswer } : qa
            ))
        } catch (err: any) {
            alert(`Failed to save: ${err.message}`)
        }
    }

    const handleRegenerate = async (questionIds: string[]) => {
        setRegenerating(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    run_id: runId,
                    user_id: user?.id,
                    question_ids: questionIds
                })
            })

            if (!response.ok) throw new Error('Regeneration failed')

            const { data: qaData, error: qaError } = await supabase
                .from('qa_pairs')
                .select('*')
                .eq('run_id', runId)
                .order('question_number', { ascending: true })

            if (qaError) throw qaError
            setQaPairs(qaData)

            const { data: runData, error: runError } = await supabase
                .from('runs')
                .select('*')
                .eq('id', runId)
                .single()

            if (runError) throw runError
            setRun(runData)

        } catch (err: any) {
            alert(`Regeneration failed: ${err.message}`)
        } finally {
            setRegenerating(false)
        }
    }

    const handleExport = async () => {
        setExporting(true)
        try {
            const response = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ run_id: runId as string }),
            })

            if (!response.ok) throw new Error('Export failed')

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `DChat_Response_${(runId as string).substring(0, 8)}.docx`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

        } catch (err: any) {
            alert(`Export failed: ${err.message}`)
        } finally {
            setExporting(false)
        }
    }

    // Single-view navigation helpers
    const goToPrevQuestion = () => {
        const idx = qaPairs.findIndex(qa => qa.question_number === activeQuestionNumber)
        if (idx > 0) setActiveQuestionNumber(qaPairs[idx - 1].question_number)
    }

    const goToNextQuestion = () => {
        const idx = qaPairs.findIndex(qa => qa.question_number === activeQuestionNumber)
        if (idx < qaPairs.length - 1) setActiveQuestionNumber(qaPairs[idx + 1].question_number)
    }

    const currentIdx = qaPairs.findIndex(qa => qa.question_number === activeQuestionNumber)

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

    const avgConfidence = qaPairs.length > 0
        ? qaPairs.reduce((acc, qa) => acc + qa.confidence, 0) / qaPairs.length
        : 0;

    const navItems = qaPairs.map(qa => ({
        id: qa.id,
        questionNumber: qa.question_number,
        isFound: qa.is_found,
        hasEditedAnswer: !!qa.edited_answer,
    }));

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Top bar: Back + Title + Actions */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 transition-colors shadow-sm flex-shrink-0"
                        title="Back to Dashboard"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Review Answers</h1>
                        <div className="flex items-center text-sm text-gray-500 mt-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {run?.questionnaire_filename}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* View mode toggle */}
                        <div className="inline-flex rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden">
                            <button
                                onClick={() => setViewMode('all')}
                                className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                title="View all questions"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setViewMode('single')}
                                className={`px-3 py-2 text-xs font-medium transition-colors border-l border-gray-300 ${viewMode === 'single' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                title="View single question"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </button>
                        </div>
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {exporting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Export DOCX
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <CoverageSummary
                    total={run?.total_questions || 0}
                    answered={run?.answered_count || 0}
                    notFound={run?.not_found_count || 0}
                    avgConfidence={avgConfidence}
                />

                {/* Single view: Prev/Next bar */}
                {viewMode === 'single' && qaPairs.length > 0 && (
                    <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 mb-4 mt-4">
                        <button
                            onClick={goToPrevQuestion}
                            disabled={currentIdx <= 0}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Previous
                        </button>
                        <span className="text-sm font-medium text-gray-500">
                            Question {currentIdx + 1} of {qaPairs.length}
                        </span>
                        <button
                            onClick={goToNextQuestion}
                            disabled={currentIdx >= qaPairs.length - 1}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Content area with nav sidebar */}
                <div className="mt-4 flex gap-4 items-start">
                    {/* Left sidebar: Question Navigation */}
                    <div className="hidden md:block">
                        <QuestionNav
                            items={navItems}
                            activeQuestionNumber={activeQuestionNumber}
                            onNavigate={(qNum) => {
                                if (viewMode === 'all') scrollToQuestion(qNum)
                                else setActiveQuestionNumber(qNum)
                            }}
                            viewMode={viewMode}
                        />
                    </div>

                    {/* Main QA content */}
                    <div className="flex-1 min-w-0">
                        <QATable
                            qaPairs={qaPairs}
                            onSaveEdit={handleSaveEdit}
                            onRegenerate={handleRegenerate}
                            regenerating={regenerating}
                            viewMode={viewMode}
                            currentQuestionNumber={activeQuestionNumber}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
