'use client'

import { useState } from 'react'
import ConfidenceBadge from './ConfidenceBadge'

export interface EvidenceSnippet {
    text: string;
    source: string;
    similarity: number;
}

export interface QAPair {
    id: string;
    question_number: number;
    question_text: string;
    generated_answer?: string;
    edited_answer?: string;
    citations: string[];
    confidence: number;
    evidence_snippets: EvidenceSnippet[];
    is_found: boolean;
}

interface QATableProps {
    qaPairs: QAPair[];
    onSaveEdit: (id: string, newAnswer: string) => Promise<void>;
    onRegenerate?: (questionIds: string[]) => Promise<void>;
    regenerating?: boolean;
    viewMode: 'all' | 'single';
    currentQuestionNumber?: number | null;
}

/* ------- Single Question Detail View ------- */
function SingleQuestionView({
    qa,
    onSaveEdit,
    onRegenerate,
    regenerating,
}: {
    qa: QAPair;
    onSaveEdit: (id: string, newAnswer: string) => Promise<void>;
    onRegenerate?: (questionIds: string[]) => Promise<void>;
    regenerating?: boolean;
}) {
    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState('')
    const [expandEvidence, setExpandEvidence] = useState(true)

    const handleEditClick = () => {
        setEditing(true)
        setEditValue(qa.edited_answer || qa.generated_answer || '')
    }

    const handleSave = async () => {
        await onSaveEdit(qa.id, editValue)
        setEditing(false)
    }

    return (
        <div
            id={`qa-${qa.question_number}`}
            data-question-number={qa.question_number}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-24"
        >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white text-sm font-bold flex-shrink-0">
                                {qa.question_number}
                            </span>
                            <div className="flex items-center gap-2">
                                <ConfidenceBadge confidence={qa.confidence} />
                                {!qa.is_found && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                        Not Found
                                    </span>
                                )}
                                {qa.edited_answer && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                        Edited
                                    </span>
                                )}
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 leading-relaxed">
                            {qa.question_text}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {onRegenerate && (
                            <button
                                onClick={() => onRegenerate([qa.id])}
                                disabled={regenerating}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                                title="Regenerate this answer"
                            >
                                <svg className={`w-3.5 h-3.5 mr-1 ${regenerating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Regenerate
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Answer section */}
            <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Answer</h4>
                    {!editing && (
                        <button
                            onClick={handleEditClick}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                        </button>
                    )}
                </div>

                {editing ? (
                    <div className="space-y-3">
                        <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full min-h-[200px] p-4 text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm leading-relaxed"
                            placeholder="Write your answer here..."
                            autoFocus
                        />
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setEditing(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="prose max-w-none text-gray-700 leading-relaxed bg-gray-50/50 p-5 rounded-lg border border-gray-100">
                        {qa.edited_answer || qa.generated_answer ? (
                            <p className="whitespace-pre-wrap m-0">{qa.edited_answer || qa.generated_answer}</p>
                        ) : (
                            <p className="text-gray-400 italic m-0">Not found in references.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Citations */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Citations</h4>
                {qa.citations && qa.citations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {qa.citations.map((cite, i) => (
                            <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 shadow-sm">
                                <svg className="w-3 h-3 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                {cite}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 italic">No citations found</p>
                )}
            </div>

            {/* Evidence snippets */}
            {qa.evidence_snippets && qa.evidence_snippets.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-100">
                    <button
                        onClick={() => setExpandEvidence(!expandEvidence)}
                        className="flex items-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 hover:text-gray-700 transition-colors"
                    >
                        <svg
                            className={`mr-1.5 h-4 w-4 transform transition-transform duration-200 ${expandEvidence ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Evidence Snippets ({qa.evidence_snippets.length})
                    </button>
                    {expandEvidence && (
                        <div className="space-y-3">
                            {qa.evidence_snippets.map((snippet, idx) => (
                                <div key={idx} className="bg-amber-50/50 p-4 rounded-lg border border-amber-100/60 text-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-amber-900 border border-amber-200 bg-amber-100 rounded px-2 py-0.5 text-xs">{snippet.source}</span>
                                        <span className="text-xs font-medium text-amber-600 bg-white px-2 py-0.5 rounded-full border border-amber-200 shadow-sm">
                                            Match: {Math.round(snippet.similarity * 100)}%
                                        </span>
                                    </div>
                                    <p className="text-gray-700 italic leading-relaxed">&ldquo;{snippet.text}&rdquo;</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

/* ------- All Questions List View (read-only) ------- */
function AllQuestionsView({
    qaPairs,
    onRegenerate,
    regenerating,
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    handleRegenerate,
}: {
    qaPairs: QAPair[];
    onRegenerate?: (questionIds: string[]) => Promise<void>;
    regenerating?: boolean;
    selectedIds: Set<string>;
    toggleSelection: (id: string) => void;
    toggleSelectAll: () => void;
    handleRegenerate: () => Promise<void>;
}) {
    return (
        <div className="flex flex-col space-y-4">
            {/* Bulk controls */}
            {onRegenerate && (
                <div className="flex items-center justify-between bg-white px-5 py-3 rounded-lg shadow-sm border border-gray-200 sticky top-0 z-10">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                            <input
                                type="checkbox"
                                checked={selectedIds.size === qaPairs.length && qaPairs.length > 0}
                                onChange={toggleSelectAll}
                                className="peer h-5 w-5 cursor-pointer transition-all appearance-none rounded shadow hover:shadow-md border border-slate-300 checked:bg-blue-600 checked:border-blue-600"
                            />
                            <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                </svg>
                            </span>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                            Select All <span className="text-gray-400 font-normal">({selectedIds.size} of {qaPairs.length})</span>
                        </span>
                    </label>
                    <button
                        onClick={handleRegenerate}
                        disabled={selectedIds.size === 0 || regenerating}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-md hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                        {regenerating ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Regenerating...
                            </>
                        ) : (
                            <>
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Regenerate Selected
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Compact question rows */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {qaPairs.map((qa) => (
                    <div
                        key={qa.id}
                        id={`qa-${qa.question_number}`}
                        data-question-number={qa.question_number}
                        className={`px-5 py-4 hover:bg-gray-50 transition-colors scroll-mt-24 ${selectedIds.has(qa.id) ? 'bg-blue-50/50' : ''}`}
                    >
                        <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            {onRegenerate && (
                                <div className="relative flex items-center justify-center mt-0.5 flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(qa.id)}
                                        onChange={() => toggleSelection(qa.id)}
                                        className="peer h-4 w-4 cursor-pointer transition-all appearance-none rounded shadow hover:shadow-md border border-slate-300 checked:bg-blue-600 checked:border-blue-600"
                                    />
                                    <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                    </span>
                                </div>
                            )}

                            {/* Question number */}
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 text-gray-600 text-xs font-bold flex-shrink-0">
                                {qa.question_number}
                            </span>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 leading-snug mb-1">
                                    {qa.question_text}
                                </p>
                                <p className="text-sm text-gray-500 line-clamp-2">
                                    {qa.edited_answer || qa.generated_answer || (
                                        <span className="italic text-gray-400">Not found in references.</span>
                                    )}
                                </p>
                            </div>

                            {/* Status badges */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <ConfidenceBadge confidence={qa.confidence} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ------- Main QATable Component ------- */
export default function QATable({ qaPairs, onSaveEdit, onRegenerate, regenerating = false, viewMode, currentQuestionNumber }: QATableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === qaPairs.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(qaPairs.map(qa => qa.id)))
    }

    const handleRegenerate = async () => {
        if (onRegenerate && selectedIds.size > 0) {
            await onRegenerate(Array.from(selectedIds))
            setSelectedIds(new Set())
        }
    }

    if (viewMode === 'single') {
        const currentQa = qaPairs.find(qa => qa.question_number === currentQuestionNumber) || qaPairs[0];
        if (!currentQa) return <p className="text-gray-400 text-center py-12">No questions available.</p>;
        return (
            <SingleQuestionView
                qa={currentQa}
                onSaveEdit={onSaveEdit}
                onRegenerate={onRegenerate}
                regenerating={regenerating}
            />
        );
    }

    return (
        <AllQuestionsView
            qaPairs={qaPairs}
            onRegenerate={onRegenerate}
            regenerating={regenerating}
            selectedIds={selectedIds}
            toggleSelection={toggleSelection}
            toggleSelectAll={toggleSelectAll}
            handleRegenerate={handleRegenerate}
        />
    )
}
