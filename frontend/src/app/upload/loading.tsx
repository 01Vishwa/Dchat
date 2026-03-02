export default function UploadLoading() {
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                <div className="h-8 w-72 bg-gray-200 rounded animate-pulse mb-6"></div>
                <div className="space-y-8">
                    <div>
                        <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
                        <div className="h-32 w-full bg-gray-100 rounded-md border-2 border-dashed border-gray-200 animate-pulse"></div>
                    </div>
                    <div className="border-t border-gray-200 pt-8">
                        <div className="h-5 w-56 bg-gray-200 rounded animate-pulse mb-4"></div>
                        <div className="h-32 w-full bg-gray-100 rounded-md border-2 border-dashed border-gray-200 animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}
