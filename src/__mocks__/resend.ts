export class Resend {
  constructor(_apiKey?: string) {}
  emails = {
    send: (_params: Record<string, unknown>) => Promise.resolve({ id: 'mock-id' })
  }
}
