/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testRegex: '(/test/.*\\.test\\.ts)$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  coverageReporters: ['lcov', 'cobertura', 'html', 'text', 'text-summary'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    './test/setupEnvs.ts',
    './test/mocks',
  ],
  maxConcurrency: 20,
}
