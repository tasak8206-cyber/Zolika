import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: prices } = await supabase
    .from('latest_prices')
    .select('*')
    .order('scraped_at', { ascending: false })

  const { data: products } = await supabase
    .from('products')
    .select('id')

  const { data: urls } = await supabase
    .from('competitor_urls')
    .select('id')

  const undercut = prices?.filter(p =>
    p.scraped_price && p.own_price && p.scraped_price < p.own_price
  ).length ?? 0

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Saját Termékek</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold">{products?.length ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Figyelt URL-ek</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold">{urls?.length ?? 0}</p></CardContent>
        </Card>
        <Card className={undercut > 0 ? 'border-red-500' : ''}>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Olcsóbb Versenytárs</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-4xl font-bold ${undercut > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {undercut}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Jelenlegi Versenytárs Árak</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Termék</TableHead>
                <TableHead>Versenytárs</TableHead>
                <TableHead>Saját Ár</TableHead>
                <TableHead>Versenytárs Ára</TableHead>
                <TableHead>Változás</TableHead>
                <TableHead>Státusz</TableHead>
                <TableHead>Frissítve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices?.map((row) => {
                const isUndercut = row.scraped_price && row.own_price
                  && row.scraped_price < row.own_price

                return (
                  <TableRow key={row.competitor_url_id}
                    className={isUndercut ? 'bg-red-50' : ''}
                  >
                    <TableCell className="font-medium">
                      {row.product_name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <a href={row.url ?? '#'} target="_blank"
                        className="text-blue-600 hover:underline">
                        {row.competitor_name ?? '—'}
                      </a>
                    </TableCell>
                    <TableCell>
                      {row.own_price
                        ? `${Number(row.own_price).toLocaleString('hu-HU')} ${row.currency ?? ''}`
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className={isUndercut ? 'text-red-600 font-bold' : 'text-green-600'}>
                      {row.scraped_price
                        ? `${Number(row.scraped_price).toLocaleString('hu-HU')} ${row.currency ?? ''}`
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {row.price_delta_pct != null ? (
                        <span className={row.price_delta_pct < 0 ? 'text-green-600' : 'text-red-600'}>
                          {row.price_delta_pct > 0 ? '+' : ''}
                          {Number(row.price_delta_pct ?? 0).toFixed(2)}%
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.in_stock ? 'default' : 'secondary'}>
                        {row.in_stock ? 'Készleten' : 'Elfogyott'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.scraped_at
                        ? new Date(row.scraped_at).toLocaleDateString('hu-HU')
                        : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
              {(!prices || prices.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Még nincsenek adatok. Adj hozzá termékeket és versenytárs URL-eket!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}