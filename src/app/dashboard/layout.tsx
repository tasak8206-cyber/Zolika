import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogoutButton } from './_components/LogoutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigáció */}
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-primary">💰 Árazás Figyelő</h1>
          <div className="flex gap-4">
            <a href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </a>
            <a href="/dashboard/products"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Termékek
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <LogoutButton />
        </div>
      </nav>
      {/* Tartalom */}
      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
    </div>
  )
}