'use client'

import { useState } from 'react'
import { updateProduct, deleteProduct } from '@/actions/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Props {
  product: {
    id: string
    name: string
    sku: string | null
    own_price: number | null
    currency: string
    category: string | null
  }
}

export function EditProductDialog({ product }: Props) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      await updateProduct(product.id, formData)
      toast.success('Termék sikeresen frissítve!')
      setOpen(false)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Hiba történt')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Biztosan törlöd a(z) "${product.name}" terméket?`)) return

    try {
      await deleteProduct(product.id)
      toast.success('Termék törölve!')
      setOpen(false)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Hiba történt')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">✏️ Szerkesztés</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Termék szerkesztése</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Termék neve *</label>
            <Input name="name" defaultValue={product.name} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">SKU</label>
              <Input name="sku" defaultValue={product.sku ?? ''} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategória</label>
              <Input name="category" defaultValue={product.category ?? ''} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Saját ár</label>
              <Input
                name="own_price"
                type="number"
                step="0.01"
                defaultValue={product.own_price ?? ''}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pénznem</label>
              <select name="currency" defaultValue={product.currency}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="HUF">HUF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Mentés...' : '💾 Mentés'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              🗑️ Törlés
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}