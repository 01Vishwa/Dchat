'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toUpperCase() || 'FILE'
}

function getFormatColor(ext: string): string {
    const colors: Record<string, string> = {
        'PDF': 'bg-red-100 text-red-700 border-red-200',
        'XLSX': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'XLS': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'DOCX': 'bg-blue-100 text-blue-700 border-blue-200',
        'DOC': 'bg-blue-100 text-blue-700 border-blue-200',
        'TXT': 'bg-slate-100 text-slate-700 border-slate-200',
    }
    return colors[ext] || 'bg-slate-100 text-slate-700 border-slate-200'
}

function getFileIcon(ext: string) {
    if (ext === 'PDF') return (
        <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" /><path d="M8 12h2c.55 0 1 .45 1 1s-.45 1-1 1H9v2H8v-4zm4 0h1.5c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5H12v-4zm3 0h3v1h-2v.5h1.5v1H16V16h-1v-4z" /></svg>
    )
    if (ext === 'XLSX' || ext === 'XLS') return (
        <svg className="h-8 w-8 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" /><path d="M8 13l1.5 2L8 17h1.2l.9-1.4.9 1.4H12l-1.5-2L12 13h-1.2l-.9 1.3-.8-1.3H8zm5 0v4h3v-1h-2v-3h-1z" /></svg>
    )
    if (ext === 'DOCX' || ext === 'DOC') return (
        <svg className="h-8 w-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" /><path d="M8 13h1l.5 2.5.5-2.5h1l.5 2.5.5-2.5h1l-1 4h-1l-.5-2-.5 2h-1l-1-4z" /></svg>
    )
    return (
        <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    )
}

/* --------------- Drop Zone Component --------------- */
function DropZone({ accept, multiple, onFiles, children }: {
    accept: string, multiple: boolean, onFiles: (f: File[]) => void, children?: React.ReactNode
}) {
    const [dragging, setDragging] = useState(false)

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation()
        setDragging(e.type === 'dragenter' || e.type === 'dragover')
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setDragging(false)
        if (e.dataTransfer.files?.length) onFiles(Array.from(e.dataTransfer.files))
    }, [onFiles])

    const id = `drop-${accept.replace(/[^a-z]/g, '')}-${multiple ? 'm' : 's'}`
    return (
        <div
            className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer text-center
                ${dragging ? 'border-blue-400 bg-blue-50 scale-[1.01]' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}`}
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            onClick={() => document.getElementById(id)?.click()}
        >
            <input
                id={id} type="file" className="sr-only" accept={accept} multiple={multiple}
                onChange={e => { if (e.target.files?.length) { onFiles(Array.from(e.target.files)); e.target.value = '' } }}
            />
            {children ? children : (
                <>
                    <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors ${dragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <svg className={`h-7 w-7 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                        Drop {multiple ? 'files' : 'file'} here or <span className="text-blue-600 hover:text-blue-700">browse</span>
                    </p>
                    <p className="text-xs text-gray-400">{accept.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')} — max 10 MB</p>
                </>
            )}
        </div>
    )
}

/* --------------- File Card Component --------------- */
function FileCard({ file, onRemove }: { file: File, onRemove: () => void }) {
    const ext = getFileExtension(file.name)
    return (
        <div className="group flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all">
            <div className="flex-shrink-0">{getFileIcon(ext)}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getFormatColor(ext)}`}>{ext}</span>
                    <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>
                </div>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove() }}
                className="flex-shrink-0 p-1.5 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Remove">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    )
}

/* --------------- Main Page --------------- */
export default function UploadPage() {
    const router = useRouter()
    const supabase = createSupabaseBrowserClient()
    const [step, setStep] = useState(1)
    const [questionnaire, setQuestionnaire] = useState<File | null>(null)
    const [references, setReferences] = useState<File[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const steps = [
        { num: 1, label: 'Questionnaire' },
        { num: 2, label: 'References' },
        { num: 3, label: 'Review & Process' },
    ]

    const addReferences = useCallback((files: File[]) => {
        setReferences(prev => {
            const existing = new Set(prev.map(f => f.name + f.size))
            const newFiles = files.filter(f => !existing.has(f.name + f.size))
            return [...prev, ...newFiles]
        })
    }, [])

    const handleSubmit = async () => {
        if (!questionnaire || references.length === 0) return
        setLoading(true)
        setError(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            const formData = new FormData()
            formData.append('questionnaire', questionnaire)
            references.forEach(file => formData.append('references', file))
            formData.append('user_id', user.id)

            const response = await fetch('/api/parse', { method: 'POST', body: formData })
            if (!response.ok) throw new Error('Failed to process documents')

            const data = await response.json()
            router.push(`/review/${data.run_id}`)
        } catch (err: any) {
            setError(err.message || 'An error occurred')
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
            {/* Stepper */}
            <div className="flex items-center justify-center mb-10">
                {steps.map((s, i) => (
                    <div key={s.num} className="flex items-center">
                        <button
                            onClick={() => {
                                if (s.num === 1) setStep(1)
                                if (s.num === 2 && questionnaire) setStep(2)
                                if (s.num === 3 && questionnaire && references.length > 0) setStep(3)
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                                ${step === s.num ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : ''}
                                ${step > s.num ? 'bg-green-100 text-green-700' : ''}
                                ${step < s.num ? 'bg-gray-100 text-gray-400' : ''}
                            `}
                        >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                ${step === s.num ? 'bg-white text-blue-600' : ''}
                                ${step > s.num ? 'bg-green-500 text-white' : ''}
                                ${step < s.num ? 'bg-gray-200 text-gray-400' : ''}
                            `}>
                                {step > s.num ? '✓' : s.num}
                            </span>
                            <span className="hidden sm:inline">{s.label}</span>
                        </button>
                        {i < steps.length - 1 && (
                            <div className={`w-12 sm:w-20 h-0.5 mx-2 rounded transition-colors ${step > s.num ? 'bg-green-400' : 'bg-gray-200'}`} />
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Step 1: Questionnaire */}
                {step === 1 && (
                    <div className="p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-1">Upload Questionnaire</h2>
                            <p className="text-sm text-gray-500">Upload the vendor security questionnaire you need answered</p>
                        </div>

                        {!questionnaire ? (
                            <DropZone accept=".pdf,.xlsx,.docx" multiple={false}
                                onFiles={(files) => setQuestionnaire(files[0] || null)} />
                        ) : (
                            <div className="space-y-4">
                                <FileCard file={questionnaire} onRemove={() => setQuestionnaire(null)} />
                                <div className="flex items-center justify-center gap-2 py-2 text-sm text-green-600 bg-green-50 rounded-lg">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Questionnaire ready
                                </div>
                            </div>
                        )}

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!questionnaire}
                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next: Add References
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Reference Documents */}
                {step === 2 && (
                    <div className="p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-1">Upload Reference Documents</h2>
                            <p className="text-sm text-gray-500">Add policies, SOC 2 reports, or any documentation used for answering</p>
                        </div>

                        <DropZone accept=".txt,.pdf,.docx" multiple={true} onFiles={addReferences}>
                            {references.length > 0 ? (
                                <>
                                    <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                                        <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-blue-600 font-medium">Add more files</p>
                                    <p className="text-xs text-gray-400 mt-1">Drop here or click to browse</p>
                                </>
                            ) : undefined}
                        </DropZone>

                        {references.length > 0 && (
                            <div className="mt-6 space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {references.length} reference{references.length !== 1 ? 's' : ''} added
                                    </p>
                                    <button type="button" onClick={() => setReferences([])}
                                        className="text-xs text-red-500 hover:text-red-700 font-medium">
                                        Clear all
                                    </button>
                                </div>
                                {references.map((file, idx) => (
                                    <FileCard key={`${file.name}-${idx}`} file={file}
                                        onRemove={() => setReferences(prev => prev.filter((_, i) => i !== idx))} />
                                ))}
                            </div>
                        )}

                        <div className="mt-8 flex justify-between">
                            <button onClick={() => setStep(1)}
                                className="flex items-center gap-2 text-gray-600 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>
                            <button onClick={() => setStep(3)}
                                disabled={references.length === 0}
                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                Next: Review
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Review & Process */}
                {step === 3 && (
                    <div className="p-8">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Process</h2>
                            <p className="text-sm text-gray-500">Confirm your files and start the AI-powered assessment</p>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                                    <h3 className="text-sm font-semibold text-blue-900">Questionnaire</h3>
                                </div>
                                {questionnaire && <FileCard file={questionnaire} onRemove={() => { setQuestionnaire(null); setStep(1) }} />}
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                                    <h3 className="text-sm font-semibold text-emerald-900">{references.length} Reference{references.length !== 1 ? 's' : ''}</h3>
                                </div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {references.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-emerald-800 bg-white rounded-lg px-3 py-2 border border-emerald-100">
                                            {getFileIcon(getFileExtension(file.name))}
                                            <span className="truncate flex-1">{file.name}</span>
                                            <span className="text-xs text-emerald-500 flex-shrink-0">{formatFileSize(file.size)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-between">
                            <button onClick={() => setStep(2)}
                                className="flex items-center gap-2 text-gray-600 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>
                            <button onClick={handleSubmit} disabled={loading}
                                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Process Documents
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
