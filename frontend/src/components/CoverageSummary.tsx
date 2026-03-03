'use client'

interface CoverageSummaryProps {
    total: number;
    answered: number;
    notFound: number;
    avgConfidence: number;
}

export default function CoverageSummary({ total, answered, notFound, avgConfidence }: CoverageSummaryProps) {
    const answeredPct = total > 0 ? Math.round((answered / total) * 100) : 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 mt-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 font-display tracking-tight">Coverage Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Questions */}
                <div className="bg-gray-50 rounded-lg p-4 flex flex-col justify-center">
                    <div className="flex items-center text-sm font-medium text-gray-500 mb-1">
                        <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Total Options
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{total}</div>
                </div>

                {/* Answered */}
                <div className="bg-green-50 rounded-lg p-4 flex flex-col justify-center">
                    <div className="flex items-center text-sm font-medium text-green-700 mb-1">
                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Answered
                    </div>
                    <div className="text-3xl font-bold text-green-700">{answered}</div>
                </div>

                {/* Not Found */}
                <div className={notFound > 0 ? "bg-red-50 rounded-lg p-4 flex flex-col justify-center" : "bg-gray-50 rounded-lg p-4 flex flex-col justify-center"}>
                    <div className={`flex items-center text-sm font-medium mb-1 ${notFound > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Not Found
                    </div>
                    <div className={`text-3xl font-bold ${notFound > 0 ? 'text-red-700' : 'text-gray-900'}`}>{notFound}</div>
                </div>

                {/* Avg Confidence */}
                <div className="bg-blue-50 rounded-lg p-4 flex flex-col justify-center">
                    <div className="flex items-center text-sm font-medium text-blue-700 mb-1">
                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Avg. Confidence
                    </div>
                    <div className="text-3xl font-bold text-blue-700">{Math.round(avgConfidence * 100)}%</div>
                </div>
            </div>
        </div>
    )
}
