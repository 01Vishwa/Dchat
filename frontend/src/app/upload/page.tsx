'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FileUpload from '@/components/FileUpload'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function UploadPage() {
    const router = useRouter()
    const supabase = createSupabaseBrowserClient()
    const [questionnaire, setQuestionnaire] = useState<File | null>(null)
    const [references, setReferences] = useState<File[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!questionnaire) {
            setError("Please upload a questionnaire file.")
            return
        }

        if (references.length === 0) {
            setError("Please upload at least one reference document.")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            const formData = new FormData()
            formData.append('questionnaire', questionnaire)
            references.forEach(file => formData.append('references', file))
            formData.append('user_id', user.id)

            const response = await fetch('/api/parse', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Failed to process documents')
            }

            const data = await response.json()

            // Navigate to review page
            router.push(`/review/${data.run_id}`)

        } catch (err: any) {
            setError(err.message || 'An error occurred during upload')
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">New Vendor Security Assessment</h1>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">1. Upload Questionnaire</h3>
                        <FileUpload
                            label="Questionnaire (PDF, XLSX, DOCX)"
                            accept=".pdf,.xlsx,.docx"
                            onFilesSelected={(files) => setQuestionnaire(files[0] || null)}
                        />
                        {questionnaire && (
                            <p className="mt-2 text-sm text-green-600">
                                Selected: {questionnaire.name}
                            </p>
                        )}
                    </div>

                    <div className="border-t border-gray-200 pt-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">2. Upload Reference Documents</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Upload internal policies, SOC 2 reports, or other documentation to be used for answering.
                        </p>
                        <FileUpload
                            label="Reference Documents (TXT, PDF, DOCX)"
                            accept=".txt,.pdf,.docx"
                            multiple={true}
                            onFilesSelected={(files) => setReferences(prev => [...prev, ...files])}
                        />
                        {references.length > 0 && (
                            <ul className="mt-4 space-y-2">
                                {references.map((file, idx) => (
                                    <li key={idx} className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                                        {file.name}
                                        <button
                                            type="button"
                                            onClick={() => setReferences(prev => prev.filter((_, i) => i !== idx))}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 p-4 rounded-md">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || !questionnaire || references.length === 0}
                            className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : 'Process Documents'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
