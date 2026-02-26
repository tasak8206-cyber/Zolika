import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'CommonJS' } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@upstash/ratelimit$': '<rootDir>/src/__mocks__/upstash-ratelimit.ts',
    '^@upstash/redis$': '<rootDir>/src/__mocks__/upstash-redis.ts',
    '^resend$': '<rootDir>/src/__mocks__/resend.ts',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
}

export default config
