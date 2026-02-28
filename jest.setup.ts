/**
 * Jest globális setup fájl.
 * Tesztkörnyezetben szükséges env változók beállítása.
 * A moduleNameMapper mock-ok (resend, upstash) már a jest.config.ts-ben vannak.
 */

process.env.RESEND_API_KEY = 'test-api-key'
process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
