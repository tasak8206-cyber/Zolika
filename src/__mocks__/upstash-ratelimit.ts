export class Ratelimit {
  static slidingWindow(_tokens: number, _window: string) { return {} }
  limit(_id: string): Promise<{ success: boolean; remaining: number; limit: number; reset: number }> {
    return Promise.resolve({ success: true, remaining: 0, limit: 0, reset: 0 })
  }
}
