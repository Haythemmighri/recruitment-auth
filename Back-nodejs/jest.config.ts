import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  // Runs BEFORE modules are imported — sets all env vars for config
  setupFiles: ['<rootDir>/jest.setup.ts'],
  // Runs after test framework — used for afterAll cleanup
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  // Mock passport globally to prevent passport.use() errors during imports
  moduleNameMapper: {},
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/tests/**',
    '!src/server.ts',
    '!src/**/*.d.ts',
  ],
  testTimeout: 30000,
  forceExit: true,
  clearMocks: true,
  verbose: true,
  // Suppress specific errors that are expected in test mocks
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};

export default config;
