'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getProducts() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      competitor_urls (
        id,
        competitor_name,
        url,
        last_status,
        last_scraped_at
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function addProduct(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('products')
    .insert({
      user_id:   user.id,
      name:      formData.get('name') as string,
      sku:       formData.get('sku') as string || null,
      own_price: Number(formData.get('own_price')) || null,
      currency:  (formData.get('currency') as 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'HUF') || 'HUF',
      category:  formData.get('category') as string || null,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/products')
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/products')
}

export async function updateProduct(productId: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({
      name:      formData.get('name') as string,
      sku:       formData.get('sku') as string || null,
      own_price: Number(formData.get('own_price')) || null,
      currency:  (formData.get('currency') as 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'HUF') || 'HUF',
      category:  formData.get('category') as string || null,
    })
    .eq('id', productId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/products')
}