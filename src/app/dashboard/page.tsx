'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // ✅ GYŐZŐDJ MEG, HOGY KLIENS-OLDALON VAGY
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return  // ✅ NE FUSS SZERVER-OLDALON!

    checkAuth()
  }, [isClient])  // ✅ PROPER DEPENDENCY!

  async function checkAuth() {
    try {
      // ✅ ELLENŐRIZD, HOGY KLIENS
      if (typeof window === 'undefined') {
        return
      }

      // ✅ localStorage-ből olvass
      const userStr = localStorage.getItem('user')
      
      if (!userStr) {
        console.log('❌ Nincs user localstorage-ban')
        router.push('/login')
        return
      }

      const userData = JSON.parse(userStr)
      console.log('✅ User found:', userData.email)
      setUser(userData)
      setLoading(false)
    } catch (err) {
      console.error('Auth error:', err)
      
      // ✅ TISZTÍTS FEL
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user')
        localStorage.removeItem('session')
      }
      
      router.push('/login')
    }
  }

  async function handleLogout() {
    try {
      // ✅ ÚJ CLIENT - LOGOUT-hoz
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      )

      await supabase.auth.signOut()

      // ✅ localStorage CLEAN UP
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user')
        localStorage.removeItem('session')
      }

      console.log('✅ Kijelentkezve')
      router.push('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  // ✅ AMÍG BETÖLTÖDIK VAGY NINCS KLIENS
  if (!isClient || loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>⏳ Betöltés...</h2>
      </div>
    )
  }

  // ✅ HA NEM VAN USER - NE MUTASS SEMMIT
  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>❌ Nincs hozzáférés</h2>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>🎉 Dashboard</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          🚪 Kijelentkezés
        </button>
      </div>

      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h2>✅ Sikeresen bejelentkeztél!</h2>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>User ID:</strong> {user?.id}</p>
        <p>Az alkalmazás működik! 🚀</p>
      </div>
    </div>
  )
}