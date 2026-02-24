'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function LoginPage() {
  const [email, setEmail] = useState('test@test.com')
  const [password, setPassword] = useState('Test123!')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // ✅ KLIENS-OLDALI SUPABASE AUTH
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      )

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error('❌ Bejelentkezési hiba:', signInError.message)
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (data.user && data.session) {
        console.log('✅ Sikeres bejelentkezés:', data.user.email)
        
        // ✅ localStorage-ba
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(data.user))
          localStorage.setItem('session', JSON.stringify(data.session))
        }
        
        // ✅ DELAY + redirect
        setTimeout(() => {
          router.push('/dashboard')
        }, 500)
        return
      }

      setError('Ismeretlen hiba!')
      setLoading(false)
    } catch (err: any) {
      console.error('❌ Hiba:', err)
      setError(err.message || 'Bejelentkezési hiba!')
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: '500px',
      margin: '50px auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🔐 Bejelentkezés</h1>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              marginTop: '5px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password">Jelszó:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              marginTop: '5px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
            required
          />
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: '15px', padding: '10px', backgroundColor: '#ffe0e0', borderRadius: '4px' }}>
            ❌ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: loading ? '#ccc' : '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {loading ? '⏳ Betöltés...' : '✅ Bejelentkezés'}
        </button>
      </form>

      <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        Teszt: test@test.com / Test123!
      </p>
    </div>
  )
}