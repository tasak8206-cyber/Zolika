import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface PriceAlertProps {
  to: string
  productName: string
  competitorName: string
  competitorPrice: number
  ownPrice: number
  currency: string
  url: string
}

export async function sendPriceAlert({
  to,
  productName,
  competitorName,
  competitorPrice,
  ownPrice,
  currency,
  url,
}: PriceAlertProps) {
  const diff = ((competitorPrice - ownPrice) / ownPrice * 100).toFixed(1)
  const cheaper = competitorPrice < ownPrice

  await resend.emails.send({
    from: 'Árazás Figyelő <ertesito@resend.dev>',
    to,
    subject: `⚠️ ${competitorName} olcsóbban árulja: ${productName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${cheaper ? '#dc2626' : '#16a34a'}">
          ${cheaper ? '⚠️ Árazási figyelmeztetés!' : '✅ Te vagy a legolcsóbb!'}
        </h2>
        <p>A <strong>${competitorName}</strong> megváltoztatta az árát:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f9fafb;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Termék</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>${productName}</strong></td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Saját ár</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${ownPrice.toLocaleString('hu-HU')} ${currency}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${competitorName} ára</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: ${cheaper ? '#dc2626' : '#16a34a'}; font-weight: bold;">
              ${competitorPrice.toLocaleString('hu-HU')} ${currency} (${diff}%)
            </td>
          </tr>
        </table>
        <a href="${url}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          Termék megtekintése →
        </a>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
          Árazás Figyelő — automatikus értesítő
        </p>
      </div>
    `
  })
}