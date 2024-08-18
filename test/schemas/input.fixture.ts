import { faker } from '@faker-js/faker'

import { Custom, Storage, objectCannedACLs } from '../../src/schemas/input'
import { DeepPartial } from '../../src/types'

export const sampleStoragePatterns = {
  single: ['test/assets/giraffe/*'],
  multiple: ['test/assets/giraffe-multiple/*'],
}

export const sampleStorage: Storage = {
  name: 'my-static-site-assets',
  patterns: sampleStoragePatterns.single,
  actions: ['upload', 'delete'],
  prefix: '',
  enabled: true,
  acl: undefined,
  tags: {},
  metadata: {},
  gitignore: false,
  ignoreFiles: [],
}

const generateStorage = (overrides: Partial<Storage> = {}): Storage => ({
  ...sampleStorage,
  name: faker.internet.domainName(),
  patterns: sampleStoragePatterns.single,
  prefix: faker.lorem.word(),
  enabled: faker.datatype.boolean(),
  acl: faker.helpers.arrayElement(objectCannedACLs),
  tags: { tagKey: faker.lorem.word() },
  metadata: { exampleKey: faker.lorem.word() },
  ...overrides,
})

const createBaseInputFixture = (): Required<Custom> => ({
  syncCloudStorage: {
    disabled: faker.datatype.boolean(),
    storages: [generateStorage()],
    endpoint: faker.internet.url(),
    offline: faker.datatype.boolean(),
    region: process.env.AWS_REGION || '',
    silent: false,
  },
})

interface FixtureOptions {
  patterns?: string[]
  name?: string
  prefix?: string
  endpoint?: string
  region?: string
  silent?: boolean
  storageOverrides?: Partial<Storage>
}

const createCustomInputFixture = ({
  patterns = sampleStoragePatterns.single,
  name = '',
  prefix = '',
  endpoint = '',
  region = process.env.AWS_REGION || '',
  silent = false,
  storageOverrides = {},
}: FixtureOptions = {}): Custom => ({
  syncCloudStorage: {
    disabled: false,
    endpoint,
    offline: true,
    region,
    silent,
    storages: [
      {
        ...sampleStorage,
        name,
        patterns,
        prefix,
        ...storageOverrides,
      },
    ],
  },
})

export const createValidInputFixture = (options: FixtureOptions = {}): Custom =>
  createCustomInputFixture(options)

export const createValidCdkInputFixture = (
  options: FixtureOptions = {}
): Custom['syncCloudStorage'] =>
  createValidInputFixture(options).syncCloudStorage

export const createValidInputFixtureWithACLBucketOwner = (
  options: FixtureOptions = {}
): Required<Custom> =>
  createCustomInputFixture({
    ...options,
    storageOverrides: {
      ...options.storageOverrides,
      acl: 'bucket-owner-full-control',
    },
  })

export const createValidInputFixtureWithTags = (
  options: FixtureOptions = {}
): Required<Custom> =>
  createCustomInputFixture({
    ...options,
    storageOverrides: {
      ...options.storageOverrides,
      tags: { [faker.lorem.word()]: faker.lorem.word() },
    },
  })

export const createValidInputFixtureWithMetadata = (
  options: FixtureOptions = {}
): Required<Custom> =>
  createCustomInputFixture({
    ...options,
    storageOverrides: {
      ...options.storageOverrides,
      metadata: { [faker.lorem.word()]: faker.lorem.word() },
    },
  })

export const createValidDisabledInputFixture = (): Required<Custom> => ({
  ...createBaseInputFixture(),
  syncCloudStorage: {
    ...createBaseInputFixture().syncCloudStorage,
    disabled: true,
  },
})

export const createValidInputFileFixture = (): Required<Custom> =>
  createBaseInputFixture()

export const createInvalidInputFixture = (
  additionalProps: DeepPartial<Custom> = {}
) => ({
  syncCloudStorage: {
    disabled: 'true',
    storages: [
      {
        name: faker.internet.domainName(),
        patterns: false,
        actions: 123,
        prefix: 456,
        enabled: 'false',
        acl: undefined,
        metadata: 'key: value',
        tags: [],
      },
    ],
    endpoint: faker.internet.url(),
    offline: faker.datatype.boolean(),
  },
  ...additionalProps,
})
