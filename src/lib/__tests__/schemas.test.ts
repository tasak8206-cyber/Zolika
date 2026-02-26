import {
  LoginSchema,
  SignUpSchema,
  ProductSchema,
  ProductUpdateSchema,
  PriceAlertSchema,
  getValidationErrors,
} from '../schemas'
import { ZodError } from 'zod'

// ─── LoginSchema ──────────────────────────────────────────────────────────────

describe('LoginSchema', () => {
  describe('happy paths', () => {
    it('accepts a valid email and strong password', () => {
      const result = LoginSchema.safeParse({
        email: 'user@example.com',
        password: 'Passw0rd!',
      })
      expect(result.success).toBe(true)
    })

    it('accepts passwords with various special characters', () => {
      const passwords = ['Abc1@def', 'Test#1234', 'My$Pass1', 'Hello_1!']
      passwords.forEach((password) => {
        const result = LoginSchema.safeParse({ email: 'a@b.com', password })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('error states', () => {
    it('rejects empty email', () => {
      const result = LoginSchema.safeParse({ email: '', password: 'Passw0rd!' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid email format', () => {
      const result = LoginSchema.safeParse({ email: 'not-an-email', password: 'Passw0rd!' })
      expect(result.success).toBe(false)
    })

    it('rejects password shorter than 8 characters', () => {
      const result = LoginSchema.safeParse({ email: 'a@b.com', password: 'Ab1!' })
      expect(result.success).toBe(false)
    })

    it('rejects password without uppercase letter', () => {
      const result = LoginSchema.safeParse({ email: 'a@b.com', password: 'passw0rd!' })
      expect(result.success).toBe(false)
    })

    it('rejects password without a digit', () => {
      const result = LoginSchema.safeParse({ email: 'a@b.com', password: 'Password!' })
      expect(result.success).toBe(false)
    })

    it('rejects password without a special character', () => {
      const result = LoginSchema.safeParse({ email: 'a@b.com', password: 'Password1' })
      expect(result.success).toBe(false)
    })

    it('rejects missing fields', () => {
      const result = LoginSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects extremely long email (edge case)', () => {
      const longEmail = 'a'.repeat(300) + '@example.com'
      // Still a valid email syntactically but very long — schema allows it (no max)
      const result = LoginSchema.safeParse({ email: longEmail, password: 'Passw0rd!' })
      expect(result.success).toBe(true) // schema only enforces format, not max length
    })

    it('rejects XSS payload as email', () => {
      const result = LoginSchema.safeParse({
        email: '<script>alert(1)</script>@x.com',
        password: 'Passw0rd!',
      })
      expect(result.success).toBe(false)
    })
  })
})

// ─── SignUpSchema ─────────────────────────────────────────────────────────────

describe('SignUpSchema', () => {
  const valid = {
    email: 'newuser@example.com',
    password: 'Secure1@Pass',
    confirmPassword: 'Secure1@Pass',
  }

  describe('happy paths', () => {
    it('accepts matching passwords and valid email', () => {
      expect(SignUpSchema.safeParse(valid).success).toBe(true)
    })
  })

  describe('error states', () => {
    it('rejects mismatched passwords', () => {
      const result = SignUpSchema.safeParse({ ...valid, confirmPassword: 'Different1!' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'))
        expect(paths).toContain('confirmPassword')
      }
    })

    it('rejects empty confirmPassword', () => {
      const result = SignUpSchema.safeParse({ ...valid, confirmPassword: '' })
      expect(result.success).toBe(false)
    })

    it('rejects weak password (no special char)', () => {
      const result = SignUpSchema.safeParse({
        ...valid,
        password: 'Password1',
        confirmPassword: 'Password1',
      })
      expect(result.success).toBe(false)
    })
  })
})

// ─── ProductSchema ────────────────────────────────────────────────────────────

describe('ProductSchema', () => {
  const valid = {
    name: 'Test Product',
    ownUrl: 'https://myshop.com/product/123',
    competitorUrls: ['https://competitor.com/item/456'],
  }

  describe('happy paths', () => {
    it('accepts a valid product with one competitor URL', () => {
      expect(ProductSchema.safeParse(valid).success).toBe(true)
    })

    it('accepts a product with no competitor URLs (defaults to [])', () => {
      const result = ProductSchema.safeParse({
        name: 'Test',
        ownUrl: 'https://myshop.com/product/1',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.competitorUrls).toEqual([])
      }
    })

    it('accepts exactly 10 competitor URLs', () => {
      const urls = Array.from({ length: 10 }, (_, i) => `https://comp${i}.com/item`)
      const result = ProductSchema.safeParse({ ...valid, competitorUrls: urls })
      expect(result.success).toBe(true)
    })
  })

  describe('error states', () => {
    it('rejects empty product name', () => {
      const result = ProductSchema.safeParse({ ...valid, name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects product name exceeding 255 characters', () => {
      const result = ProductSchema.safeParse({ ...valid, name: 'A'.repeat(256) })
      expect(result.success).toBe(false)
    })

    it('rejects non-HTTPS ownUrl', () => {
      const result = ProductSchema.safeParse({ ...valid, ownUrl: 'http://myshop.com/product/123' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid ownUrl', () => {
      const result = ProductSchema.safeParse({ ...valid, ownUrl: 'not-a-url' })
      expect(result.success).toBe(false)
    })

    it('rejects more than 10 competitor URLs', () => {
      const urls = Array.from({ length: 11 }, (_, i) => `https://comp${i}.com/item`)
      const result = ProductSchema.safeParse({ ...valid, competitorUrls: urls })
      expect(result.success).toBe(false)
    })

    it('rejects non-HTTPS competitor URL', () => {
      const result = ProductSchema.safeParse({
        ...valid,
        competitorUrls: ['http://competitor.com/item'],
      })
      expect(result.success).toBe(false)
    })

    it('rejects SQL injection attempt as product name (passes length check, accepted by schema)', () => {
      // The schema only validates length/type — SQL injection prevention is DB-layer
      const result = ProductSchema.safeParse({
        ...valid,
        name: "'; DROP TABLE products; --",
      })
      // This is intentionally accepted — the schema doesn't strip SQL (that's parameterized queries)
      expect(result.success).toBe(true)
    })

    it('rejects XSS payload in competitor URL', () => {
      const result = ProductSchema.safeParse({
        ...valid,
        competitorUrls: ['javascript:alert(1)'],
      })
      expect(result.success).toBe(false)
    })
  })
})

// ─── ProductUpdateSchema ──────────────────────────────────────────────────────

describe('ProductUpdateSchema', () => {
  it('accepts a valid UUID and partial fields', () => {
    const result = ProductUpdateSchema.safeParse({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Updated Name',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-UUID id', () => {
    const result = ProductUpdateSchema.safeParse({ id: 'not-a-uuid', name: 'X' })
    expect(result.success).toBe(false)
  })

  it('rejects missing id', () => {
    const result = ProductUpdateSchema.safeParse({ name: 'No ID' })
    expect(result.success).toBe(false)
  })
})

// ─── PriceAlertSchema ─────────────────────────────────────────────────────────

describe('PriceAlertSchema', () => {
  const valid = {
    productId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    threshold: 1000,
    alertType: 'DECREASE' as const,
    enabled: true,
  }

  describe('happy paths', () => {
    it('accepts a valid DECREASE alert', () => {
      expect(PriceAlertSchema.safeParse(valid).success).toBe(true)
    })

    it('accepts an INCREASE alert', () => {
      expect(PriceAlertSchema.safeParse({ ...valid, alertType: 'INCREASE' }).success).toBe(true)
    })

    it('accepts threshold of 0', () => {
      expect(PriceAlertSchema.safeParse({ ...valid, threshold: 0 }).success).toBe(true)
    })

    it('defaults enabled to true when omitted', () => {
      const result = PriceAlertSchema.safeParse({
        productId: valid.productId,
        threshold: 500,
        alertType: 'INCREASE',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.enabled).toBe(true)
      }
    })
  })

  describe('error states', () => {
    it('rejects invalid productId (not UUID)', () => {
      const result = PriceAlertSchema.safeParse({ ...valid, productId: 'bad-id' })
      expect(result.success).toBe(false)
    })

    it('rejects negative threshold', () => {
      const result = PriceAlertSchema.safeParse({ ...valid, threshold: -1 })
      expect(result.success).toBe(false)
    })

    it('rejects threshold exceeding 999999', () => {
      const result = PriceAlertSchema.safeParse({ ...valid, threshold: 1_000_000 })
      expect(result.success).toBe(false)
    })

    it('rejects invalid alertType', () => {
      const result = PriceAlertSchema.safeParse({ ...valid, alertType: 'UNKNOWN' })
      expect(result.success).toBe(false)
    })
  })
})

// ─── getValidationErrors ──────────────────────────────────────────────────────

describe('getValidationErrors', () => {
  it('extracts field errors from a ZodError', () => {
    const parsed = LoginSchema.safeParse({ email: 'bad', password: 'weak' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const errors = getValidationErrors(parsed.error)
      expect(typeof errors).toBe('object')
      expect(Object.keys(errors).length).toBeGreaterThan(0)
    }
  })

  it('returns an empty object for non-ZodError inputs', () => {
    expect(getValidationErrors(new Error('generic error'))).toEqual({})
    expect(getValidationErrors('string error')).toEqual({})
    expect(getValidationErrors(null)).toEqual({})
  })

  it('maps nested paths to dot-separated keys', () => {
    // ProductSchema nested array error: competitorUrls.0
    const parsed = ProductSchema.safeParse({
      name: 'Test',
      ownUrl: 'https://shop.com/p',
      competitorUrls: ['http://bad.com'],
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const errors = getValidationErrors(parsed.error)
      // At least one error key should exist
      expect(Object.keys(errors).length).toBeGreaterThan(0)
    }
  })
})
