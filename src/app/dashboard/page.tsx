import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProducts } from '@/actions/products'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Package, Bell, TrendingDown, TrendingUp, ShieldCheck, Activity } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // A motor beolvassa az adatbázist a saját getProducts függvényeddel
  const products = await getProducts() || []

  // Valódi statisztikák számolása
  const totalProducts = products.length
  let totalCompetitors = 0
  let undercutCount = 0   // versenytársak akik olcsóbban árulnak
  let dominantCount = 0   // versenytársak akiknél te vagy olcsóbb

  // Legfrissebb árakat lekérdezzük a price_history-ból
  const { data: latestPrices } = await supabase
    .from('price_history')
    .select('competitor_url_id, scraped_price, product_id')
    .eq('status', 'success')
    .order('scraped_at', { ascending: false })

  // Minden versenyárnál az első (legfrissebb) rekordot tartjuk meg
  const latestByCompetitor = new Map<string, number>()
  for (const row of latestPrices ?? []) {
    if (!latestByCompetitor.has(row.competitor_url_id) && row.scraped_price !== null) {
      latestByCompetitor.set(row.competitor_url_id, row.scraped_price)
    }
  }

  products.forEach(product => {
    const competitors = Array.isArray(product.competitor_urls) ? product.competitor_urls : []
    totalCompetitors += competitors.length

    if (product.own_price) {
      competitors.forEach((cu: { id: string }) => {
        const competitorPrice = latestByCompetitor.get(cu.id)
        if (competitorPrice !== undefined) {
          if (competitorPrice < product.own_price!) undercutCount++
          else dominantCount++
        }
      })
    }
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Fejléc */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Áttekintés</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Valós idejű piaci áttekintés és versenytárs analízis.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
          <ShieldCheck className="w-4 h-4" />
          Adatgyűjtő motor aktív
        </div>
      </div>

      {/* Szuperkártyák (Dinamikus adatokkal) */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Saját Termékek</CardTitle>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-slate-900">{totalProducts}</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">Összes rögzített cikk</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Figyelt Versenytársak</CardTitle>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-slate-900">{totalCompetitors}</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">Folyamatosan szkennelt linkek</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Alád Vágtak (Kritikus)</CardTitle>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><TrendingDown className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-slate-900">{undercutCount}</p>
            <p className="text-xs text-rose-600/80 mt-2 font-medium flex items-center gap-1">
              <Bell className="w-3 h-3" /> {undercutCount > 0 ? 'Azonnali beavatkozást igényel' : 'Minden termék versenyképes'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Domináns Pozíció</CardTitle>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-slate-900">{dominantCount}</p>
            <p className="text-xs text-emerald-600/80 mt-2 font-medium">Te vagy a legolcsóbb a piacon</p>
          </CardContent>
        </Card>

      </div>

      {/* Navigáció a termékekhez (a régi üres táblázat helyett) */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg">Készen állsz a részletekre?</CardTitle>
          <CardDescription className="text-sm">
            A versenytársak linkjeit és a pontos ártörténeti grafikonokat a Termékek menüpont alatt találod.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex justify-center">
          <Link
            href="/dashboard/products"
            className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-slate-900 text-white hover:bg-slate-800 h-10 px-8 py-2"
          >
            Irány a Termékek és Árak kezelése →
          </Link>
        </CardContent>
      </Card>

    </div>
  )
}