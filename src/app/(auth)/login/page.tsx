'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Sikeres regisztráció! Ellenőrizd az emailed.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Hiba történt')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          {isRegister ? '🆕 Regisztráció' : '🔐 Bejelentkezés'}
        </CardTitle>
        <CardDescription>
          {isRegister
            ? 'Hozz létre egy új fiókot'
            : 'Jelentkezz be a fiókodba'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="pelda@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Jelszó</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Betöltés...' : isRegister ? 'Regisztráció' : 'Bejelentkezés'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {isRegister ? 'Már van fiókod?' : 'Nincs még fiókod?'}{' '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-primary underline font-medium"
          >
            {isRegister ? 'Bejelentkezés' : 'Regisztráció'}
          </button>
        </p>
      </CardContent>
    </Card>
  )
}