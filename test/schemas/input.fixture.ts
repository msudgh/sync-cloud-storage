import { faker } from '@faker-js/faker'

import { Custom, Storage, objectCannedACLs } from '../../src/schemas/input'
import { DeepPartial } from '../../src/types'

export const sampleStorage: Storage = {
  name: 'my-static-site-assets',
  bucketPrefix: 'animals',
  localPath: './assets/giraffe',
  actions: ['upload', 'delete'],
  acl: 'public-read',
  enabled: true,
  tags: {},
}

const createBaseInputFixture = (): Required<Custom> => ({
  syncCloudStorage: {
    disabled: faker.datatype.boolean(),
    storages: [
      {
        name: faker.internet.domainName(),
        localPath: faker.system.directoryPath(),
        actions: ['upload', 'delete'],
        bucketPrefix: faker.lorem.word(),
        enabled: faker.datatype.boolean(),
        acl: faker.helpers.arrayElement(objectCannedACLs),
        defaultContentType: faker.system.mimeType(),
        metadata: {
          exampleKey: faker.lorem.word(),
        },
        tags: {
          tagKey: faker.lorem.word(),
        },
      },
    ],
    endpoint: faker.internet.url(),
    offline: faker.datatype.boolean(),
  },
})

export const createValidInputFixture = (
  localPath: string,
  name = '',
  bucketPrefix = '',
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
          localPath,
          bucketPrefix: bucketPrefix,
        },
      ],
    },
  }
}

export const createValidInputFixtureWithTags = (
  localPath: string,
  name = '',
  bucketPrefix = '',
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
          localPath,
          bucketPrefix,
          tags: {
            [faker.lorem.word()]: faker.lorem.word(),
          },
        },
      ],
    },
  }
}

export const createValidInputFixtureWithMetadata = (
  localPath: string,
  name = '',
  bucketPrefix = '',
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
          localPath,
          bucketPrefix,
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
  baseInputFixture.syncCloudStorage.storages[0].localPath =
    faker.system.filePath()
  return baseInputFixture
}

export const createValidInputDirectoryFixture = (): Required<Custom> => {
  const baseInputFixture = createBaseInputFixture()
  baseInputFixture.syncCloudStorage.storages[0].localPath =
    faker.system.directoryPath()
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
        localPath: false,
        actions: 123,
        bucketPrefix: 456,
        enabled: 'false',
        acl: undefined,
        defaultContentType: false,
        metadata: 'key: value',
        tags: [],
      },
    ],
    endpoint: faker.internet.url(),
    offline: faker.datatype.boolean(),
  },
  ...additionalProps,
})
