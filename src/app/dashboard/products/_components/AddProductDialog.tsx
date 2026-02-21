
'use client'

import { useState } from 'react'
import { addProduct } from '@/actions/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export function AddProductDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      await addProduct(formData)
      toast.success('Termék sikeresen hozzáadva!')
      setOpen(false)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Hiba történt')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Új termék</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új termék hozzáadása</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Termék neve *</label>
            <Input name="name" placeholder="pl. Nike Air Max 90" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">SKU</label>
              <Input name="sku" placeholder="pl. NAM-90-BLK" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategória</label>
              <Input name="category" placeholder="pl. Cipők" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Saját ár</label>
              <Input name="own_price" type="number" step="0.01" placeholder="29990" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pénznem</label>
              <select name="currency"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="HUF">HUF</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Mentés...' : 'Termék hozzáadása'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}