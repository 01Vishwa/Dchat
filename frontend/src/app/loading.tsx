export default function Loading() {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
                {/* Spinner */}
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                {/* Text */}
                <p className="text-gray-600 font-medium text-lg">Loading...</p>
                <p className="text-gray-400 text-sm">Please wait a moment</p>
            </div>
        </div>
    )
}
