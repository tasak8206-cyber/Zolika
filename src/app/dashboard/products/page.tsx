import { EditProductDialog } from './_components/EditProductDialog'
import { getProducts } from '@/actions/products'
import { getPriceHistory } from '@/actions/competitor-urls'
import { AddProductDialog } from './_components/AddProductDialog'
import { AddCompetitorDialog } from './_components/AddCompetitorDialog'
import { PriceHistoryChart } from './_components/PriceHistoryChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Termékek</h2>
        <AddProductDialog />
      </div>

      {products?.map((product) => (
        <Card key={product.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {product.sku && <span className="mr-3">SKU: {product.sku}</span>}
                  {product.category && <span>Kategória: {product.category}</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg">
                  {product.own_price
                    ? `${Number(product.own_price).toLocaleString('hu-HU')} ${product.currency}`
                    : '—'}
                </span>
                <EditProductDialog product={product} />
                <AddCompetitorDialog
                  productId={product.id}
                  productName={product.name}
                />
              </div>
            </div>
          </CardHeader>

          {(product.competitor_urls as CompetitorUrl[])?.length > 0 && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Versenytárs</TableHead>
                    <TableHead>Legutóbbi ár</TableHead>
                    <TableHead>Különbség</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead>Árelőzmény (30 nap)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(product.competitor_urls as CompetitorUrl[]).map((cu) => (
                    <CompetitorRow
                      key={cu.id}
                      competitor={cu}
                      ownPrice={Number(product.own_price)}
                      currency={product.currency}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      ))}

      {(!products || products.length === 0) && (
        <Card>
          <CardContent className="text-center text-muted-foreground py-16">
            Még nincsenek termékek. Adj hozzá egyet a gombbal!
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Típusok ──────────────────────────────────────────
interface CompetitorUrl {
  id: string
  competitor_name: string
  url: string
  last_status: string | null
  last_scraped_at: string | null
}

// ── Versenytárs sor komponens ─────────────────────────
async function CompetitorRow({
  competitor, ownPrice, currency
}: {
  competitor: CompetitorUrl
  ownPrice: number
  currency: string
}) {
  const history = await getPriceHistory(competitor.id)
  const latestPrice = history?.[history.length - 1]?.scraped_price
  const diff = latestPrice && ownPrice
    ? ((latestPrice - ownPrice) / ownPrice * 100)
    : null

  return (
    <TableRow>
      <TableCell>
        <a href={competitor.url} target="_blank"
          className="text-blue-600 hover:underline font-medium">
          {competitor.competitor_name}
        </a>
      </TableCell>
      <TableCell className={
        latestPrice && ownPrice
          ? latestPrice < ownPrice ? 'text-red-600 font-bold' : 'text-green-600 font-bold'
          : ''
      }>
        {latestPrice
          ? `${Number(latestPrice).toLocaleString('hu-HU')} ${currency}`
          : <span className="text-muted-foreground">Még nem scraped</span>}
      </TableCell>
      <TableCell>
        {diff !== null ? (
          <Badge variant={diff < 0 ? 'destructive' : 'default'}>
            {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
          </Badge>
        ) : '—'}
      </TableCell>
      <TableCell>
        <Badge variant={
          competitor.last_status === 'success' ? 'default' :
          competitor.last_status === 'failed' ? 'destructive' : 'secondary'
        }>
          {competitor.last_status ?? 'Várakozik'}
        </Badge>
      </TableCell>
      <TableCell className="min-w-[200px]">
        <PriceHistoryChart
          data={history ?? []}
          competitorName={competitor.competitor_name}
        />
      </TableCell>
    </TableRow>
  )
}