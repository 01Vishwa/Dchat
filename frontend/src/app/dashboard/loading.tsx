export default function DashboardLoading() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <ul className="divide-y divide-gray-200">
                    {[1, 2, 3].map((i) => (
                        <li key={i} className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                                <div className="flex space-x-2">
                                    <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse"></div>
                                    <div className="h-5 w-24 bg-gray-100 rounded animate-pulse"></div>
                                </div>
                            </div>
                            <div className="mt-2 flex space-x-6">
                                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
                                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
