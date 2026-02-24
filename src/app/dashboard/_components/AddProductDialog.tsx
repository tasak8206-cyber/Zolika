'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function AddProductDialog() {
  const [open, setOpen] = useState(false)
  const [ownUrl, setOwnUrl] = useState('')
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([''])
  const [isLoading, setIsLoading] = useState(false)

  function addCompetitorField() {
    setCompetitorUrls((prev) => [...prev, ''])
  }

  function removeCompetitorField(index: number) {
    setCompetitorUrls((prev) => prev.filter((_, i) => i !== index))
  }

  function updateCompetitorUrl(index: number, value: string) {
    setCompetitorUrls((prev) => prev.map((url, i) => (i === index ? value : url)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      // TODO: wire up to server action / API route
      await new Promise((resolve) => setTimeout(resolve, 500))
      setOpen(false)
      setOwnUrl('')
      setCompetitorUrls([''])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add New Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Provide your product URL and the competitor product URLs you want to track.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="own-url">Your Product URL</Label>
            <Input
              id="own-url"
              type="url"
              placeholder="https://yourstore.com/product/..."
              value={ownUrl}
              onChange={(e) => setOwnUrl(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Competitor URLs</Label>
            {competitorUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="url"
                  placeholder={`https://competitor${index + 1}.com/product/...`}
                  value={url}
                  onChange={(e) => updateCompetitorUrl(index, e.target.value)}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={competitorUrls.length === 1}
                    onClick={() => removeCompetitorField(index)}
                    aria-label="Remove competitor URL"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCompetitorField}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add another competitor
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving…' : 'Start Tracking'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
