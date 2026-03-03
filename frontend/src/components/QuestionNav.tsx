'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'

interface QuestionNavItem {
    id: string;
    questionNumber: number;
    isFound: boolean;
    hasEditedAnswer: boolean;
}

interface QuestionNavProps {
    items: QuestionNavItem[];
    activeQuestionNumber: number | null;
    onNavigate: (questionNumber: number) => void;
    viewMode: 'all' | 'single';
}

const PAGE_SIZE = 20;

export default function QuestionNav({ items, activeQuestionNumber, onNavigate, viewMode }: QuestionNavProps) {
    const totalPages = Math.ceil(items.length / PAGE_SIZE);
    const activePageIdx = activeQuestionNumber
        ? Math.floor((items.findIndex(it => it.questionNumber === activeQuestionNumber)) / PAGE_SIZE)
        : 0;
    const [page, setPage] = useState(Math.max(activePageIdx, 0));

    // Sync page when active question changes
    useEffect(() => {
        if (activeQuestionNumber) {
            const idx = items.findIndex(it => it.questionNumber === activeQuestionNumber);
            if (idx >= 0) {
                setPage(Math.floor(idx / PAGE_SIZE));
            }
        }
    }, [activeQuestionNumber, items]);

    const pageItems = useMemo(() => {
        const start = page * PAGE_SIZE;
        return items.slice(start, start + PAGE_SIZE);
    }, [items, page]);

    // Stats
    const foundCount = items.filter(i => i.isFound).length;
    const editedCount = items.filter(i => i.hasEditedAnswer).length;

    return (
        <div className="sticky top-24 flex-shrink-0 w-16">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-3 px-2 flex flex-col items-center gap-1">
                {/* Stats mini header */}
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    {items.length} Q&apos;s
                </div>

                {/* Page up */}
                {totalPages > 1 && page > 0 && (
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        className="w-9 h-6 rounded text-[10px] font-medium text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"
                        title="Previous page"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                )}

                {/* Question buttons */}
                {pageItems.map((item) => {
                    const isActive = activeQuestionNumber === item.questionNumber;
                    const baseClasses = "w-10 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all duration-150 cursor-pointer";

                    let colorClasses: string;
                    if (isActive) {
                        colorClasses = "bg-blue-600 text-white shadow-md shadow-blue-200 scale-105 ring-2 ring-blue-300";
                    } else if (!item.isFound) {
                        colorClasses = "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100";
                    } else if (item.hasEditedAnswer) {
                        colorClasses = "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100";
                    } else {
                        colorClasses = "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100";
                    }

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.questionNumber)}
                            className={`${baseClasses} ${colorClasses}`}
                            title={`Q${item.questionNumber}${!item.isFound ? ' — Not Found' : item.hasEditedAnswer ? ' — Edited' : ''}`}
                        >
                            {item.questionNumber}
                        </button>
                    );
                })}

                {/* Page down */}
                {totalPages > 1 && page < totalPages - 1 && (
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        className="w-9 h-6 rounded text-[10px] font-medium text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"
                        title="Next page"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                )}

                {/* Page indicator */}
                {totalPages > 1 && (
                    <div className="text-[9px] text-gray-400 mt-1">
                        {page + 1}/{totalPages}
                    </div>
                )}

                {/* Legend */}
                <div className="border-t border-gray-100 pt-2 mt-1 flex flex-col gap-1 w-full px-1">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                        <span className="text-[8px] text-gray-400">{foundCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                        <span className="text-[8px] text-gray-400">{items.length - foundCount}</span>
                    </div>
                    {editedCount > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                            <span className="text-[8px] text-gray-400">{editedCount}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// Hook to track which question is currently in view
export function useActiveQuestion(qaPairs: { question_number: number }[]) {
    const [activeQuestionNumber, setActiveQuestionNumber] = useState<number | null>(
        qaPairs.length > 0 ? qaPairs[0].question_number : null
    );

    useEffect(() => {
        if (qaPairs.length > 0 && activeQuestionNumber === null) {
            setActiveQuestionNumber(qaPairs[0].question_number);
        }
    }, [qaPairs, activeQuestionNumber]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries.filter(e => e.isIntersecting);
                if (visibleEntries.length > 0) {
                    const topEntry = visibleEntries.reduce((closest, entry) => {
                        return entry.boundingClientRect.top < closest.boundingClientRect.top
                            ? entry
                            : closest;
                    });
                    const qNum = parseInt(topEntry.target.getAttribute('data-question-number') || '0');
                    if (qNum > 0) {
                        setActiveQuestionNumber(qNum);
                    }
                }
            },
            {
                rootMargin: '-80px 0px -60% 0px',
                threshold: [0, 0.25, 0.5]
            }
        );

        qaPairs.forEach(qa => {
            const el = document.getElementById(`qa-${qa.question_number}`);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [qaPairs]);

    const scrollToQuestion = useCallback((questionNumber: number) => {
        const el = document.getElementById(`qa-${questionNumber}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveQuestionNumber(questionNumber);
        }
    }, []);

    return { activeQuestionNumber, setActiveQuestionNumber, scrollToQuestion };
}
