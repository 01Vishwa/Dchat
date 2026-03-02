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
}

export default function QATable({ qaPairs, onSaveEdit }: QATableProps) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null)

    const handleEditClick = (qa: QAPair) => {
        setEditingId(qa.id)
        setEditValue(qa.edited_answer || qa.generated_answer || '')
    }

    const handleSave = async (id: string) => {
        await onSaveEdit(id, editValue)
        setEditingId(null)
    }

    const handleCancel = () => {
        setEditingId(null)
        setEditValue('')
    }

    const toggleEvidence = (id: string) => {
        setExpandedEvidenceId(expandedEvidenceId === id ? null : id)
    }

    return (
        <div className="flex flex-col space-y-4">
            {qaPairs.map((qa) => (
                <div key={qa.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Q{qa.question_number}: {qa.question_text}
                        </h3>
                        <div className="flex items-center space-x-3 ml-4">
                            <ConfidenceBadge confidence={qa.confidence} />
                            {!editingId || editingId !== qa.id ? (
                                <button
                                    onClick={() => handleEditClick(qa)}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    Edit
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="mb-4">
                        {editingId === qa.id ? (
                            <div className="space-y-3">
                                <textarea
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={handleCancel}
                                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleSave(qa.id)}
                                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="prose max-w-none text-gray-700">
                                <p>{qa.edited_answer || qa.generated_answer}</p>
                            </div>
                        )}
                    </div>

                    {qa.citations && qa.citations.length > 0 && (
                        <div className="mb-4">
                            <span className="text-sm font-semibold text-gray-500">Citations: </span>
                            <span className="text-sm text-gray-600">{qa.citations.join(', ')}</span>
                        </div>
                    )}

                    {/* Evidence Toggle */}
                    {qa.evidence_snippets && qa.evidence_snippets.length > 0 && (
                        <div className="border-t border-gray-100 pt-4 mt-2">
                            <button
                                onClick={() => toggleEvidence(qa.id)}
                                className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
                            >
                                <svg
                                    className={`mr-1.5 h-4 w-4 transform transition-transform ${expandedEvidenceId === qa.id ? 'rotate-90' : ''}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                {expandedEvidenceId === qa.id ? 'Hide Evidence' : 'Show Evidence'}
                            </button>

                            {expandedEvidenceId === qa.id && (
                                <div className="mt-3 space-y-3 pl-5 border-l-2 border-blue-100">
                                    {qa.evidence_snippets.map((snippet, idx) => (
                                        <div key={idx} className="bg-gray-50 p-3 rounded text-sm">
                                            <div className="flex justify-between items-center mb-1 border-b border-gray-200 pb-1">
                                                <span className="font-medium text-gray-700">{snippet.source}</span>
                                                <span className="text-xs text-gray-500">Similarity: {Math.round(snippet.similarity * 100)}%</span>
                                            </div>
                                            <p className="text-gray-600 italic">"{snippet.text}"</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
