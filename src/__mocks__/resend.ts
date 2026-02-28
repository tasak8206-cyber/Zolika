const mockSend = jest.fn()

export class Resend {
  constructor(_apiKey?: string) { }
  emails = { send: mockSend }
}

// Exportáljuk a mockot, hogy a tesztek direktben is elérhessék
export { mockSend }
