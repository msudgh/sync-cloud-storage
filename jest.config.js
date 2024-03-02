// jest.config.js
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testRegex: '(/test/.*\\.test\\.ts)$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  maxConcurrency: 20,
  testTimeout: 600000,
  coverageReporters: ['lcov', 'cobertura', 'html', 'text', 'text-summary'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    './test/setupEnvs.ts',
    './test/mocks',
  ],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.test.json', useESM: true },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: ['node_modules/(?!(globby)/)'],
  setupFiles: ['<rootDir>/test-setup.js'],
}
