export default function ReviewLoading() {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header skeleton */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="flex space-x-3">
                    <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
                </div>
            </div>

            {/* Coverage summary skeleton */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-3"></div>
                        <div className="flex space-x-6">
                            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
                            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
                            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
                        </div>
                    </div>
                    <div className="flex space-x-4 ml-8 border-l border-gray-200 pl-8">
                        <div className="text-center">
                            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse mb-2 mx-auto"></div>
                            <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
                        </div>
                        <div className="text-center">
                            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mb-2 mx-auto"></div>
                            <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* QA cards skeleton */}
            <div className="flex flex-col space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse ml-4"></div>
                        </div>
                        <div className="space-y-2 mb-4">
                            <div className="h-4 w-full bg-gray-100 rounded animate-pulse"></div>
                            <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse"></div>
                            <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse"></div>
                        </div>
                        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
