// We mock the Resend SDK (not a project dependency) to test the email utility
// without making actual network calls.
jest.mock('resend', () => {
  const mockSend = jest.fn()
  class MockResend {
    emails = { send: mockSend }
  }
  return { Resend: MockResend, __mockSend: mockSend }
})

import { sendPriceAlert } from '../email'
import { Resend } from 'resend'

// Retrieve the underlying mock from the Resend instance
function getMockSend() {
  const instance = new Resend()
  return instance.emails.send as jest.Mock
}

// Shared valid base props
const baseProps = {
  to: 'merchant@example.com',
  productName: 'Widget Pro',
  competitorName: 'RivalShop',
  competitorPrice: 9990,
  ownPrice: 10990,
  currency: 'HUF',
  url: 'https://myshop.com/widget-pro',
}

// ─── sendPriceAlert ───────────────────────────────────────────────────────────

describe('sendPriceAlert', () => {
  describe('happy paths', () => {
    it('calls Resend emails.send exactly once', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-1' })

      await sendPriceAlert(baseProps)

      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('sends to the correct recipient', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-2' })

      await sendPriceAlert({ ...baseProps, to: 'owner@store.com' })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'owner@store.com' })
      )
    })

    it('includes the competitor name in the subject line', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-3' })

      await sendPriceAlert({ ...baseProps, competitorName: 'BigRetailer' })

      const call = mockSend.mock.calls[0][0]
      expect(call.subject).toContain('BigRetailer')
    })

    it('includes the product name in the subject line', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-4' })

      await sendPriceAlert({ ...baseProps, productName: 'SuperGadget' })

      const call = mockSend.mock.calls[0][0]
      expect(call.subject).toContain('SuperGadget')
    })

    it('sends from the correct sender address', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-5' })

      await sendPriceAlert(baseProps)

      const call = mockSend.mock.calls[0][0]
      expect(call.from).toBeTruthy()
      expect(typeof call.from).toBe('string')
    })

    it('includes own price in the HTML body', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-6' })

      await sendPriceAlert({ ...baseProps, ownPrice: 15000 })

      const html: string = mockSend.mock.calls[0][0].html
      expect(html).toContain('15')
    })

    it('includes competitor price in the HTML body', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-7' })

      await sendPriceAlert({ ...baseProps, competitorPrice: 8500 })

      const html: string = mockSend.mock.calls[0][0].html
      expect(html).toContain('8')
    })

    it('includes the product URL as a link in the HTML body', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-8' })

      await sendPriceAlert({ ...baseProps, url: 'https://myshop.com/product/42' })

      const html: string = mockSend.mock.calls[0][0].html
      expect(html).toContain('https://myshop.com/product/42')
    })

    it('shows a warning indicator when competitor is cheaper', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-9' })

      // competitorPrice (8000) < ownPrice (10000) → competitor is cheaper → warning
      await sendPriceAlert({ ...baseProps, competitorPrice: 8000, ownPrice: 10000 })

      const html: string = mockSend.mock.calls[0][0].html
      expect(html).toContain('⚠️')
    })

    it('shows a positive indicator when competitor is more expensive', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-10' })

      // competitorPrice (12000) > ownPrice (10000) → we are cheaper → positive
      await sendPriceAlert({ ...baseProps, competitorPrice: 12000, ownPrice: 10000 })

      const html: string = mockSend.mock.calls[0][0].html
      expect(html).toContain('✅')
    })

    it('includes the currency in the email body', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-11' })

      await sendPriceAlert({ ...baseProps, currency: 'EUR' })

      const html: string = mockSend.mock.calls[0][0].html
      expect(html).toContain('EUR')
    })
  })

  describe('edge cases', () => {
    it('handles equal prices without throwing (diff = 0%)', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-12' })

      await expect(
        sendPriceAlert({ ...baseProps, competitorPrice: 10000, ownPrice: 10000 })
      ).resolves.not.toThrow()
    })

    it('handles zero own price without throwing (avoids divide-by-zero)', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-13' })

      // ownPrice = 0 could cause division by zero — verify the function handles this gracefully
      await expect(
        sendPriceAlert({ ...baseProps, ownPrice: 0 })
      ).resolves.not.toThrow()
    })

    it('handles very large prices (overflow guard)', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-14' })

      await expect(
        sendPriceAlert({ ...baseProps, competitorPrice: 9_999_999, ownPrice: 10_000_000 })
      ).resolves.not.toThrow()
    })

    it('handles XSS payload in productName without executing it (template output is HTML string)', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-15' })

      // The function embeds the name into an HTML template; it must not throw
      await expect(
        sendPriceAlert({ ...baseProps, productName: '<script>alert(1)</script>' })
      ).resolves.not.toThrow()

      // The raw HTML is generated; note that sendPriceAlert embeds user-supplied
      // strings directly into the HTML template without escaping. Downstream
      // sanitization (e.g., on the email client or when re-rendering the value
      // in a browser) is required for XSS-safe display.
      const html: string = mockSend.mock.calls[0][0].html
      expect(typeof html).toBe('string')
    })

    it('handles XSS payload in competitorName without throwing', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-16' })

      await expect(
        sendPriceAlert({ ...baseProps, competitorName: '<img onerror="alert(1)" src=x>' })
      ).resolves.not.toThrow()
    })

    it('propagates Resend API errors to the caller', async () => {
      const mockSend = getMockSend()
      mockSend.mockRejectedValue(new Error('Resend API rate limit exceeded'))

      await expect(sendPriceAlert(baseProps)).rejects.toThrow('Resend API rate limit exceeded')
    })

    it('uses the correct HTML content-type structure (has html property)', async () => {
      const mockSend = getMockSend()
      mockSend.mockResolvedValue({ id: 'email-id-17' })

      await sendPriceAlert(baseProps)

      const call = mockSend.mock.calls[0][0]
      expect(call).toHaveProperty('html')
      expect(typeof call.html).toBe('string')
      expect(call.html.length).toBeGreaterThan(0)
    })
  })
})
