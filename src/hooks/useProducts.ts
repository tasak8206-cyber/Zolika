'use client'

import { useCallback, useState } from 'react'
import { ProductFormData, ProductUpdateData } from '@/lib/schemas'

export interface CompetitorUrl {
  id: string
  competitor_name: string
  url: string
  last_status: string | null
  last_scraped_at: string | null
}

export interface Product {
  id: string
  user_id: string
  name: string
  sku: string | null
  own_price: number | null
  currency: 'HUF' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD'
  category: string | null
  competitor_urls: CompetitorUrl[]
  created_at: string
  updated_at: string
}

/**
 * useProducts Hook
 * Termék kezelés - CRUD operációk
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // CSRF token lekérése a dedikált /api/csrf végpontról
  const getCSRFToken = useCallback(async () => {
    try {
      const response = await fetch('/api/csrf', { method: 'GET' })
      if (!response.ok) throw new Error('CSRF token fetch failed')
      const { csrfToken } = await response.json()
      if (!csrfToken) throw new Error('CSRF token hiányzik a válaszból')
      return csrfToken as string
    } catch (err) {
      throw new Error('CSRF token fetch failed')
    }
  }, [])

  // Összes termék lekérdezése
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/products')

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`)
      }

      const { data } = await response.json()
      setProducts(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products'
      setError(message)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Termék hozzáadása
  const addProduct = useCallback(
    async (product: ProductFormData) => {
      setLoading(true)
      setError(null)

      try {
        const csrfToken = await getCSRFToken()

        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify(product),
        })

        if (!response.ok) {
          const { error: apiError } = await response.json()
          throw new Error(apiError?.message || 'Failed to add product')
        }

        const { data: newProduct } = await response.json()

        // Add to local state
        setProducts((prev) => [newProduct, ...prev])
        return newProduct
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add product'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [getCSRFToken]
  )

  // Termék frissítése
  const updateProduct = useCallback(
    async (data: ProductUpdateData) => {
      setLoading(true)
      setError(null)

      try {
        const csrfToken = await getCSRFToken()

        const response = await fetch('/api/products', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const { error: apiError } = await response.json()
          throw new Error(apiError?.message || 'Failed to update product')
        }

        const { data: updatedProduct } = await response.json()

        // Update local state
        setProducts((prev) =>
          prev.map((p) => (p.id === data.id ? updatedProduct : p))
        )
        return updatedProduct
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update product'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [getCSRFToken]
  )

  // Termék törlése
  const deleteProduct = useCallback(
    async (productId: string) => {
      setLoading(true)
      setError(null)

      try {
        const csrfToken = await getCSRFToken()

        const response = await fetch(`/api/products?id=${productId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': csrfToken,
          },
        })

        if (!response.ok) {
          const { error: apiError } = await response.json()
          throw new Error(apiError?.message || 'Failed to delete product')
        }

        // Remove from local state
        setProducts((prev) => prev.filter((p) => p.id !== productId))
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete product'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [getCSRFToken]
  )

  return {
    products,
    loading,
    error,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  }
}
