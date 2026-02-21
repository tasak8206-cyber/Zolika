'use client'

import { useState } from 'react'
import { addCompetitorUrl } from '@/actions/competitor-urls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Props {
  productId: string
  productName: string
}

export function AddCompetitorDialog({ productId, productName }: Props) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      formData.set('product_id', productId)
      await addCompetitorUrl(formData)
      toast.success('Versenytárs URL hozzáadva!')
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
        <Button variant="outline" size="sm">+ URL</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Versenytárs hozzáadása</DialogTitle>
          <p className="text-sm text-muted-foreground">Termék: <strong>{productName}</strong></p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Versenytárs neve *</label>
            <Input
              name="competitor_name"
              placeholder="pl. Emag, Alza, Media Markt"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Termék URL *</label>
            <Input
              name="url"
              type="url"
              placeholder="https://www.emag.hu/termek/..."
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Mentés...' : 'Hozzáadás'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}