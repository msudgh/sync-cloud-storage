import { faker } from '@faker-js/faker'

import { Custom, Storage, objectCannedACLs } from '../../src/schemas/input'
import { DeepPartial } from '../../src/types'

export const sampleStoragePatterns = {
  single: ['test/assets/giraffe/*'],
  multiple: ['test/assets/giraffe-multiple/*'],
}

export const sampleStorage: Storage = {
  name: 'my-static-site-assets',
  prefix: 'animals',
  patterns: sampleStoragePatterns.single,
  actions: ['upload', 'delete'],
  acl: undefined,
  enabled: true,
  tags: {},
  ignoreFiles: [],
  gitignore: false,
}

const createBaseInputFixture = (): Required<Custom> => ({
  syncCloudStorage: {
    disabled: faker.datatype.boolean(),
    storages: [
      {
        name: faker.internet.domainName(),
        patterns: sampleStoragePatterns.single,
        actions: ['upload', 'delete'],
        prefix: faker.lorem.word(),
        enabled: faker.datatype.boolean(),
        acl: faker.helpers.arrayElement(objectCannedACLs),
        metadata: {
          exampleKey: faker.lorem.word(),
        },
        tags: {
          tagKey: faker.lorem.word(),
        },
        ignoreFiles: [],
        gitignore: false,
      },
    ],
    endpoint: faker.internet.url(),
    offline: faker.datatype.boolean(),
  },
})

export const createValidInputFixture = (
  patterns: string[],
  name = '',
  prefix = '',
  endpoint = process.env.AWS_ENDPOINT_URL
): Required<Custom> => {
  return {
    syncCloudStorage: {
      disabled: false,
      endpoint: endpoint,
      offline: true,
      storages: [
        {
          ...sampleStorage,
          name,
          patterns,
          prefix: prefix,
        },
      ],
    },
  }
}

export const createValidInputFixtureWithACLBucketOwner = (
  patterns: string[],
  name = '',
  prefix = '',
  endpoint = process.env.AWS_ENDPOINT_URL
): Required<Custom> => {
  return {
    syncCloudStorage: {
      disabled: false,
      endpoint: endpoint,
      offline: true,
      storages: [
        {
          ...sampleStorage,
          name,
          patterns,
          prefix: prefix,
          acl: 'bucket-owner-full-control',
        },
      ],
    },
  }
}

export const createValidInputFixtureWithTags = (
  patterns: string[],
  name = '',
  prefix = '',
  endpoint = process.env.AWS_ENDPOINT_URL
): Required<Custom> => {
  return {
    syncCloudStorage: {
      disabled: false,
      endpoint,
      offline: true,
      storages: [
        {
          ...sampleStorage,
          name,
          patterns,
          prefix,
          tags: {
            [faker.lorem.word()]: faker.lorem.word(),
          },
        },
      ],
    },
  }
}

export const createValidInputFixtureWithMetadata = (
  patterns: string[],
  name = '',
  prefix = '',
  endpoint = process.env.AWS_ENDPOINT_URL
): Required<Custom> => {
  return {
    syncCloudStorage: {
      disabled: false,
      endpoint,
      offline: true,
      storages: [
        {
          ...sampleStorage,
          name,
          patterns,
          prefix,
          metadata: {
            [faker.lorem.word()]: faker.lorem.word(),
          },
        },
      ],
    },
  }
}

export const createValidDisabledInputFixture = (): Required<Custom> => {
  const baseInputFixture = createBaseInputFixture()
  baseInputFixture.syncCloudStorage.disabled = true
  return baseInputFixture
}

export const createValidInputFileFixture = (): Required<Custom> => {
  const baseInputFixture = createBaseInputFixture()
  return baseInputFixture
}

export const createValidInputDirectoryFixture = (): Required<Custom> => {
  const baseInputFixture = createBaseInputFixture()
  return baseInputFixture
}

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
