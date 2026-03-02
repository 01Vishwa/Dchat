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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 flex items-center justify-between">
            <div className="flex-1">
                <h2 className="text-lg font-medium text-gray-900 mb-1">Coverage Summary</h2>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <span><strong className="text-gray-900">{total}</strong> Total Options</span>
                    <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                        <strong className="text-gray-900 mr-1">{answered}</strong> Answered
                    </span>
                    <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-red-400 mr-2"></span>
                        <strong className="text-gray-900 mr-1">{notFound}</strong> Not Found
                    </span>
                </div>
            </div>

            <div className="ml-8 border-l border-gray-200 pl-8 flex items-center space-x-4">
                <div className="text-center">
                    <p className="text-sm font-medium text-gray-500 mb-1">Coverage</p>
                    <p className="text-2xl font-bold text-gray-900">{answeredPct}%</p>
                </div>
                <div className="text-center">
                    <p className="text-sm font-medium text-gray-500 mb-1">Avg. Confidence</p>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(avgConfidence * 100)}%</p>
                </div>
            </div>
        </div>
    )
}
