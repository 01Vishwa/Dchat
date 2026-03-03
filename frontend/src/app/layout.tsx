import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DChat QA Tool',
  description: 'Automated Vendor Security Assessment tool',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Navigation */}
          <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <Link href="/" className="text-xl font-bold text-blue-600">
                      DChat QA
                    </Link>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {user ? (
                    <>
                      <span className="text-sm text-gray-500 hidden sm:block">
                        {user.email}
                      </span>
                      <LogoutButton />
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </nav>

          {/* Page Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
