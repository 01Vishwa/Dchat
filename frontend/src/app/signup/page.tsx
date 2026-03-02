import AuthForm from '@/components/AuthForm'
import Link from 'next/link'

export default function SignupPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
            <div className="w-full max-w-md space-y-8 flex flex-col items-center">
                <h1 className="text-3xl font-extrabold text-blue-600 mb-2">DChat</h1>
                <p className="text-gray-500 mb-8">Vendor Security Assessment Automation</p>

                <AuthForm type="signup" />

                <p className="mt-4 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    )
}
