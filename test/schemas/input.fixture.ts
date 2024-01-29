import { faker } from '@faker-js/faker'

import { Custom, ObjectCannedACLs, Storage } from '../../src/schemas/input'
import { DeepPartial } from '../../src/types'

export const sampleStorageName = 'my-static-site-assets'
export const sampleStorage: Storage = {
  name: sampleStorageName,
  bucketPrefix: 'animals',
  localPath: './assets/giraffe',
  actions: ['upload', 'delete'],
  acl: 'public-read',
  deleteRemoved: true,
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
        deleteRemoved: faker.datatype.boolean(),
        acl: faker.helpers.arrayElement(ObjectCannedACLs),
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

export const createValidOfflineInputFixture = (
  localPath: string,
  name = sampleStorageName,
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
          bucketPrefix,
        },
      ],
    },
  }
}

export const createValidOfflineInputFixtureWithTags = (
  localPath: string,
  name = sampleStorageName,
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

export const createValidOfflineInputFixtureWithMetadata = (
  localPath: string,
  name = sampleStorageName,
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

export const createValidAWSInputFixture = (
  localPath: string,
  name = sampleStorageName,
  bucketPrefix = ''
): Required<Custom> => {
  return {
    syncCloudStorage: {
      disabled: false,
      endpoint: undefined,
      offline: false,
      storages: [
        {
          ...sampleStorage,
          name,
          localPath,
          bucketPrefix,
        },
      ],
    },
  }
}

export const createValidAWSInputFixtureWithTags = (
  localPath: string,
  name = sampleStorageName,
  bucketPrefix = ''
): Required<Custom> => {
  return {
    syncCloudStorage: {
      disabled: false,
      endpoint: undefined,
      offline: false,
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
export const createValidAWSInputFixtureWithMetadata = (
  localPath: string,
  name = sampleStorageName,
  bucketPrefix = ''
): Required<Custom> => {
  return {
    syncCloudStorage: {
      disabled: false,
      endpoint: undefined,
      offline: false,
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
        deleteRemoved: 'remove',
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
