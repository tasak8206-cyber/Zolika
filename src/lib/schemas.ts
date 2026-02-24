import { z } from 'zod'

/**
 * Login form validáció
 */
export const LoginSchema = z.object({
  email: z
    .string()
    .email('Érvénytelen email cím')
    .min(1, 'Email cím kötelező'),
  password: z
    .string()
    .min(1, 'Jelszó kötelező')
    .min(8, 'Jelszó minimum 8 karakter')
    .refine(
      (pwd) => /[A-Z]/.test(pwd),
      'Jelszó tartalmazzon legalább egy nagybetűt'
    )
    .refine(
      (pwd) => /[0-9]/.test(pwd),
      'Jelszó tartalmazzon legalább egy számot'
    )
    .refine(
      (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
      'Jelszó tartalmazzon legalább egy speciális karaktert (!@#$%^&* stb.)'
    ),
})

export type LoginFormData = z.infer<typeof LoginSchema>

/**
 * Sign up form validáció
 */
export const SignUpSchema = z
  .object({
    email: z
      .string()
      .email('Érvénytelen email cím')
      .min(1, 'Email cím kötelező'),
    password: z
      .string()
      .min(8, 'Jelszó minimum 8 karakter')
      .refine(
        (pwd) => /[A-Z]/.test(pwd),
        'Jelszó tartalmazzon legalább egy nagybetűt'
      )
      .refine(
        (pwd) => /[0-9]/.test(pwd),
        'Jelszó tartalmazzon legalább egy számot'
      )
      .refine(
        (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
        'Jelszó tartalmazzon legalább egy speciális karaktert'
      ),
    confirmPassword: z.string().min(1, 'Jelszó megerősítés kötelező'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Jelszavak nem egyeznek',
    path: ['confirmPassword'],
  })

export type SignUpFormData = z.infer<typeof SignUpSchema>

/**
 * Termék hozzáadás validáció
 */
export const ProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Termék név kötelező')
    .max(255, 'Termék név maximum 255 karakter'),
  ownUrl: z
    .string()
    .url('Érvénytelen URL')
    .min(1, 'Saját URL kötelező')
    .refine((url) => url.startsWith('https://'), 'URL-nek HTTPS-el kell kezdődnie'),
  competitorUrls: z
    .array(
      z
        .string()
        .url('Érvénytelen versenyző URL')
        .refine((url) => url.startsWith('https://'), 'URL-nek HTTPS-el kell kezdődnie')
    )
    .optional()
    .default([])
    .refine((urls) => urls.length <= 10, 'Maximum 10 versenyző URL'),
})

export type ProductFormData = z.infer<typeof ProductSchema>

/**
 * Termék frissítés validáció (opciónaális mezők)
 */
export const ProductUpdateSchema = ProductSchema.partial().extend({
  id: z.string().uuid('Érvénytelen termék ID'),
})

export type ProductUpdateData = z.infer<typeof ProductUpdateSchema>

/**
 * Ár riasztás validáció
 */
export const PriceAlertSchema = z.object({
  productId: z.string().uuid('Érvénytelen termék ID'),
  threshold: z
    .number()
    .min(0, 'Ár küszöbnek pozitívnak kell lennie')
    .max(999999, 'Ár küszöb túl nagy'),
  alertType: z.enum(['INCREASE', 'DECREASE'], {
    errorMap: () => ({ message: 'Riasztás típus INCREASE vagy DECREASE' }),
  }),
  enabled: z.boolean().default(true),
})

export type PriceAlertFormData = z.infer<typeof PriceAlertSchema>

/**
 * Validálási hiba kezelés
 */
export function getValidationErrors(error: unknown): Record<string, string> {
  if (error instanceof z.ZodError) {
    const errors: Record<string, string> = {}
    error.errors.forEach((err) => {
      const path = err.path.join('.')
      errors[path] = err.message
    })
    return errors
  }
  return {}
}
