import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch past runs
    const { data: runs, error } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <Link
                    href="/upload"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                    New Run
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Past Runs</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        A list of all your vendor security assessments.
                    </p>
                </div>
                <ul className="divide-y divide-gray-200">
                    {!runs || runs.length === 0 ? (
                        <li className="px-4 py-8 text-center text-gray-500">
                            No runs found yet. Click "New Run" to start.
                        </li>
                    ) : (
                        runs.map((run) => (
                            <li key={run.id}>
                                <Link href={`/review/${run.id}`} className="block hover:bg-gray-50">
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-blue-600 truncate">
                                                {run.questionnaire_filename}
                                            </p>
                                            <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                                                {run.status === 'completed' ? (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        Completed
                                                    </span>
                                                ) : run.status === 'pending' ? (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                        Pending
                                                    </span>
                                                ) : (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                        Processing
                                                    </span>
                                                )}
                                                <span className="text-sm text-gray-500">
                                                    {new Date(run.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex text-sm text-gray-500">
                                                <p>Total Questions: {run.total_questions}</p>
                                                {run.status === 'completed' && (
                                                    <>
                                                        <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center">
                                                            <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                                                            Answered: {run.answered_count}
                                                        </p>
                                                        <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center">
                                                            <span className="w-2 h-2 rounded-full bg-red-400 mr-1.5"></span>
                                                            Not Found: {run.not_found_count}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    )
}
