'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCompetitorUrl(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('competitor_urls')
    .insert({
      user_id: user.id,
      product_id: formData.get('product_id') as string,
      competitor_name: formData.get('competitor_name') as string,
      url: formData.get('url') as string,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/products')
}

export async function deleteCompetitorUrl(urlId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('competitor_urls')
    .delete()
    .eq('id', urlId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/products')
}

export async function getPriceHistory(competitorUrlId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('price_history')
    .select('scraped_price, scraped_at, status')
    .eq('competitor_url_id', competitorUrlId)
    .eq('status', 'success')
    .order('scraped_at', { ascending: true })
    .limit(30)

  if (error) throw new Error(error.message)
  return data
}