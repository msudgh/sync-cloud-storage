import { DeletedObject, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { App, Stack } from 'aws-cdk-lib'
import { mock } from 'jest-mock-extended'
import { Options } from 'serverless'
import { Logging } from 'serverless/classes/Plugin'

import { getServerlessMock } from './mocks/serverless'
import {
  createValidCdkInputFixture,
  createValidDisabledInputFixture,
  createValidInputFixture,
  createValidInputFixtureWithACLBucketOwner,
  createValidInputFixtureWithMetadata,
  createValidInputFixtureWithTags,
  sampleStorage,
  sampleStoragePatterns,
} from './schemas/input.fixture'
import { setupEnvs } from './setupEnvs'
import { InvalidConfigError } from '../src/errors'
import SyncCloudStorage from '../src/index'
import { SyncCloudStorageCdk } from '../src/providers/cdk'
import { SyncCloudStorageServerless } from '../src/providers/serverless'
import { Storage } from '../src/schemas/input'
import { createStorage, deleteStorage } from '../src/storages/s3/buckets'
import * as objects from '../src/storages/s3/objects'
import {
  TagsMethodPromiseResult,
  UploadedObject,
  isFulfilledSyncResult,
} from '../src/types'
import { logger } from '../src/utils/logger'
import { mergeTags } from '../src/utils/tags'

const cwd = process.cwd()
const optionsMock = mock<Options>()
const loggingMock = mock<Logging>()

jest.mock('./src/utils/logger')

const setupStorage = async (client: S3Client, storage: Storage) => {
  try {
    await deleteStorage(client, storage)
  } catch (error) {
    logger.error('Error deleting storage:', error)
  }

  try {
    await createStorage(client, storage)
  } catch (error) {
    logger.error('Error creating storage:', error)
  }
}

const uploadedFilesExpects = (storage: Storage, files: UploadedObject[]) => {
  expect(Array.isArray(files)).toBe(true)
  expect(files.length).toBeGreaterThan(0)

  files.forEach((file) => {
    // Check for the existence of necessary properties
    expect(file).toHaveProperty('key')
    expect(file).toHaveProperty('etag')
    expect(file).toHaveProperty('versionId')
    expect(file).toHaveProperty('storage')
    expect(file).toHaveProperty('location')

    const prefix = storage.prefix ? `${storage.prefix}/` : ''
    const keyRegexStr = `${prefix}test/assets/(giraffe-multiple|giraffe)/(README\\.md|sub/README\\.md)`
    expect(file.key).toMatch(new RegExp(keyRegexStr))

    // eslint-disable-next-line no-useless-escape
    expect(file.etag).toMatch(/^\"[a-f0-9]{32}\"$/)
    expect(file.versionId).toMatch(/[A-Za-z0-9.]+/)
    expect(storage.name).toContain(file.storage)
    const locationRegex = new RegExp(`^.*/(${keyRegexStr})$`)
    expect(file.location).toMatch(locationRegex)
  })
}

const deletedFilesExpects = (
  files: DeletedObject[],
  expects: { length: number }
) => {
  const { length } = expects
  expect(Array.isArray(files)).toBe(true)
  expect(files.length).toBe(length)

  if (length > 0) {
    files.forEach((file) => {
      expect(file).toHaveProperty('Key')
      expect(file).toHaveProperty('VersionId')
    })
  }
}

describe('Providers', () => {
  let logSpy: jest.SpyInstance

  afterEach(() => {
    // Reset environment variables after each test
    delete process.env.STAGE
    delete process.env.AWS_EXECUTION_ENV
  })

  it('should return SyncCloudStorageServerless when instance is Serverless', () => {
    const cdkInputCustom = createValidInputFixture({
      patterns: sampleStoragePatterns.single,
      name: sampleStorage.name,
    })
    const mockServerless = getServerlessMock(cdkInputCustom, cwd)
    const instance = new SyncCloudStorage(mockServerless)
    expect(instance).toBeInstanceOf(SyncCloudStorageServerless)
  })

  it('should return SyncCloudStorageCdk when provider is Construct', () => {
    // Use a CDK App and Stack as scope
    const app = new App()
    const stack = new Stack(app, 'TestStack')
    const cdkInputCustom = createValidCdkInputFixture({
      patterns: sampleStoragePatterns.single,
      name: sampleStorage.name,
    })
    const instance = new SyncCloudStorage(stack, cdkInputCustom)
    expect(instance).toBeInstanceOf(SyncCloudStorageCdk)
  })

  it('should throw an error when neither Serverless nor Construct is instance', () => {
    try {
      new SyncCloudStorage({} as never)
    } catch (error) {
      expect((error as Error).message).toBe('Provider not found')
    }
  })

  it('should throw an error when provider is not found', () => {
    try {
      new SyncCloudStorage({} as never)
    } catch (error) {
      expect((error as Error).message).toBe('Provider not found')
    }
  })

  it.only('should keep logger silent when silent set to false', async () => {
    logSpy = jest.spyOn(logger, 'info')

    const stack = new Stack(new App(), 'TestStack')
    const expectedsilent = false
    const cdkInputCustom = createValidCdkInputFixture({
      patterns: sampleStoragePatterns.single,
      name: sampleStorage.name,
      silent: expectedsilent,
    })
    const instance = new SyncCloudStorage(
      stack,
      cdkInputCustom
    ) as SyncCloudStorageCdk
    expect(instance).toBeInstanceOf(SyncCloudStorageCdk)
    expect(instance.options.syncCloudStorage.silent).toBe(expectedsilent)
    expect(logger.silent).toBe(!expectedsilent)
    expect(logSpy).not.toHaveBeenCalled()
  })
})

describe.skip('Operations', () => {
  beforeAll(async () => {
    await setupEnvs()
  })

  describe('Constructor Related Tests', () => {
    it('should properly configure S3 client for offline mode', async () => {
      const serverlessInputCustom = createValidInputFixture({
        patterns: sampleStoragePatterns.single,
        name: sampleStorage.name,
      })
      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )

      expect(syncCloudStorage.client).toBeInstanceOf(S3Client)

      if (
        serverlessInputCustom.syncCloudStorage.offline === true &&
        serverlessInputCustom.syncCloudStorage.endpoint !== undefined
      ) {
        const configuredEndpoint =
          await syncCloudStorage.client?.config?.endpoint?.()

        expect(
          serverlessInputCustom.syncCloudStorage.endpoint.includes(
            `${configuredEndpoint?.hostname}`
          )
        ).toBe(true)
        expect(
          serverlessInputCustom.syncCloudStorage.endpoint.includes(
            `${configuredEndpoint?.port}`
          )
        ).toBe(true)
      }
    })

    it('should not sync when plugin is disabled', async () => {
      const serverlessInputCustom = createValidDisabledInputFixture()
      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )
      const syncStoragesSpy = jest.spyOn(syncCloudStorage, 'storages')
      const response = await syncCloudStorage.storages()

      expect(syncStoragesSpy).toHaveBeenCalledTimes(1)
      expect(response).toEqual({
        result: [{ reason: 'Plugin is disabled', status: 'rejected' }],
      })
    })

    it("should not sync when there's no bucket", async () => {
      const serverlessInputCustom = createValidInputFixture({
        patterns: sampleStoragePatterns.single,
        name: sampleStorage.name,
      })
      serverlessInputCustom.syncCloudStorage.storages = []
      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)

      try {
        new SyncCloudStorageServerless(mockServerless, optionsMock, loggingMock)
      } catch (error) {
        const typedError = error as InvalidConfigError
        expect(typedError).toBeInstanceOf(InvalidConfigError)
        expect(typedError.name).toEqual('InvalidConfigError')
      }
    })
  })

  describe('Error Handling', () => {
    it("should throw an error when the bucket doesn't exist", async () => {
      const serverlessInputCustom = createValidInputFixture({
        patterns: sampleStoragePatterns.single,
        name: 'non-existent-bucket',
      })
      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )

      const syncStoragesSpy = jest.spyOn(syncCloudStorage, 'storages')
      const response = await syncCloudStorage.storages()

      const expectedResponse = {
        result: [
          {
            reason: Error('StorageNotFound'),
            status: 'rejected',
          },
        ],
      }

      expect(syncStoragesSpy).toHaveBeenCalledTimes(1)
      expect(response).toEqual(expectedResponse)
    })

    it("should not sync tags when storage doesn't exist", async () => {
      const serverlessInputCustom = createValidInputFixture({
        patterns: sampleStoragePatterns.single,
        name: 'non-existent-bucket',
      })
      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )

      const tagsSpy = jest.spyOn(syncCloudStorage, 'tags')
      const response = await syncCloudStorage.tags()

      const expectedResponse = [
        {
          status: 'fulfilled',
          value: {
            error: Error('StorageNotFound'),
          },
        },
      ]

      expect(tagsSpy).toHaveBeenCalledTimes(1)
      expect(response).toEqual(expectedResponse)
    })
  })

  describe('Synchronization', () => {
    it('should sync when there is a new bucket and acl set to bucket owner', async () => {
      const serverlessInputCustom = createValidInputFixtureWithACLBucketOwner({
        patterns: sampleStoragePatterns.single,
        name: sampleStorage.name,
      })
      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )

      await setupStorage(
        syncCloudStorage.getS3Client(),
        serverlessInputCustom.syncCloudStorage.storages[0]
      )

      const syncStoragesSpy = jest.spyOn(syncCloudStorage, 'storages')
      const response = await syncCloudStorage.storages()

      expect(syncStoragesSpy).toHaveBeenCalledTimes(1)

      for (const result of response.result) {
        if (isFulfilledSyncResult(result)) {
          uploadedFilesExpects(result.value.storage, result.value.uploaded)
          deletedFilesExpects(result.value.deleted, { length: 0 })

          await deleteStorage(
            syncCloudStorage.getS3Client(),
            result.value.storage
          )
        }
      }
    })

    it('should sync when there is a new bucket (cdk)', async () => {
      const cdkInputCustom = createValidCdkInputFixture({
        patterns: sampleStoragePatterns.single,
        name: sampleStorage.name,
      })
      const app = new App()
      const stack = new Stack(app, 'TestStack')
      const syncCloudStorage = new SyncCloudStorage(
        stack,
        cdkInputCustom
      ) as SyncCloudStorageCdk
      const { result } = await syncCloudStorage.storages()
      expect(result).toEqual([
        expect.objectContaining({
          status: 'fulfilled',
          value: expect.objectContaining({
            uploaded: expect.arrayContaining([]),
            deleted: expect.arrayContaining([]),
          }),
        }),
      ])
    })

    it('should sync when the prefix', async () => {
      const prefix = 'animals'
      const serverlessInputCustom = createValidInputFixture({
        patterns: sampleStoragePatterns.single,
        name: sampleStorage.name,
        prefix,
      })
      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )
      await setupStorage(
        syncCloudStorage.getS3Client(),
        serverlessInputCustom.syncCloudStorage.storages[0]
      )

      const syncStoragesSpy = jest.spyOn(syncCloudStorage, 'storages')
      const response = await syncCloudStorage.storages()

      expect(syncStoragesSpy).toHaveBeenCalledTimes(1)

      for (const syncedStorage of response.result) {
        if (isFulfilledSyncResult(syncedStorage)) {
          uploadedFilesExpects(
            syncedStorage.value.storage,
            syncedStorage.value.uploaded
          )
          await deleteStorage(
            syncCloudStorage.getS3Client(),
            syncedStorage.value.storage
          )
        }
      }
    })

    it('should sync tags', async () => {
      const serverlessInputCustom = createValidInputFixtureWithTags({
        patterns: sampleStoragePatterns.single,
        name: sampleStorage.name,
      })
      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )
      await setupStorage(
        syncCloudStorage.getS3Client(),
        serverlessInputCustom.syncCloudStorage.storages[0]
      )

      const expectedTags = mergeTags(
        [],
        serverlessInputCustom.syncCloudStorage.storages[0].tags ?? {}
      )
      const tagsSpy = jest.spyOn(syncCloudStorage, 'tags')
      const newTags = await syncCloudStorage.tags()

      expect(tagsSpy).toHaveBeenCalledTimes(1)

      for (const newTag of newTags) {
        const { status, value } = newTag as TagsMethodPromiseResult
        const { result, error } = value

        expect(status).toBe('fulfilled')
        expect(error).toBe(undefined)
        expect(result).toEqual(expectedTags)
        expect(result?.length).toBeGreaterThanOrEqual(1)

        expect(
          await deleteStorage(
            syncCloudStorage.getS3Client(),
            serverlessInputCustom.syncCloudStorage.storages[0]
          )
        ).not.toBe(undefined)
      }
    })

    it('should not sync tags when plugin is disabled', async () => {
      const serverlessInputCustom = createValidDisabledInputFixture()
      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )

      const tagsSpy = jest.spyOn(syncCloudStorage, 'tags')
      const newTags = await syncCloudStorage.tags()

      expect(tagsSpy).toHaveBeenCalledTimes(1)
      expect(newTags).toEqual([{ error: 'Plugin is disabled' }])
    })

    it('should sync metadata', async () => {
      const serverlessInputCustom = createValidInputFixtureWithMetadata({
        patterns: sampleStoragePatterns.single,
        name: sampleStorage.name,
      })
      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )
      await setupStorage(
        syncCloudStorage.getS3Client(),
        serverlessInputCustom.syncCloudStorage.storages[0]
      )

      const metadataSpy = jest.spyOn(syncCloudStorage, 'metadata')
      const syncedStorages = await syncCloudStorage.metadata()

      const existingObjects = await objects.listObjects(
        syncCloudStorage.getS3Client(),
        sampleStorage
      )

      const expectedResponse = expect.arrayContaining([
        expect.objectContaining({
          status: 'fulfilled',
          value: existingObjects.map(({ Key: key }) => {
            return {
              Key: key,
              Metadata:
                serverlessInputCustom.syncCloudStorage.storages[0].metadata,
              Bucket: serverlessInputCustom.syncCloudStorage.storages[0].name,
            }
          }),
        }),
      ])

      expect(metadataSpy).toHaveBeenCalledTimes(1)
      expect(syncedStorages).toEqual(expectedResponse)

      await deleteStorage(
        syncCloudStorage.getS3Client(),
        serverlessInputCustom.syncCloudStorage.storages[0]
      )
    })
  })

  describe('Action Limitation', () => {
    it('should limit sync to specified actions: upload', async () => {
      const serverlessInputCustom = createValidInputFixture({
        patterns: sampleStoragePatterns.single,
        name: sampleStorage.name,
      })
      serverlessInputCustom.syncCloudStorage.storages[0].actions = ['upload']
      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)

      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )
      await setupStorage(
        syncCloudStorage.getS3Client(),
        serverlessInputCustom.syncCloudStorage.storages[0]
      )

      const syncStoragesSpy = jest.spyOn(syncCloudStorage, 'storages')
      const response = await syncCloudStorage.storages()

      expect(syncStoragesSpy).toHaveBeenCalledTimes(1)

      for (const result of response.result) {
        if (isFulfilledSyncResult(result)) {
          uploadedFilesExpects(result.value.storage, result.value.uploaded)
          deletedFilesExpects(result.value.deleted, { length: 0 })

          await deleteStorage(
            syncCloudStorage.getS3Client(),
            result.value.storage
          )
        }
      }
    })

    it('should limit sync to specified actions: delete', async () => {
      const serverlessInputCustom = createValidInputFixture({
        patterns: sampleStoragePatterns.single,
        name: sampleStorage.name,
      })

      serverlessInputCustom.syncCloudStorage.storages[0].actions = ['delete']

      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )
      await setupStorage(
        syncCloudStorage.getS3Client(),
        serverlessInputCustom.syncCloudStorage.storages[0]
      )

      const giraffeTXT = 'giraffe.txt'
      await syncCloudStorage.getS3Client().send(
        new PutObjectCommand({
          Bucket: serverlessInputCustom.syncCloudStorage.storages[0].name,
          Key: giraffeTXT,
          Body: 'giraffe',
        })
      )

      const syncStoragesSpy = jest.spyOn(syncCloudStorage, 'storages')
      const response = await syncCloudStorage.storages()

      const expectedResponse = expect.objectContaining({
        result: expect.arrayContaining([
          expect.objectContaining({
            status: 'fulfilled',
            value: {
              deleted: expect.arrayContaining([
                expect.objectContaining({
                  Key: giraffeTXT,
                  VersionId: expect.any(String),
                }),
              ]),
              files: expect.arrayContaining([]),
              filesToDelete: expect.arrayContaining([
                expect.stringMatching(giraffeTXT),
              ]),
              filesToUpload: expect.arrayContaining([]),
              localFilesChecksum: expect.arrayContaining([]),
              objects: expect.arrayContaining([]),
              storage: serverlessInputCustom.syncCloudStorage.storages[0],
              storageObjectsChecksum: expect.arrayContaining([]),
              uploaded: expect.arrayContaining([]),
            },
          }),
        ]),
      })

      expect(syncStoragesSpy).toHaveBeenCalledTimes(1)
      expect(response).toEqual(expectedResponse)

      await deleteStorage(
        syncCloudStorage.getS3Client(),
        serverlessInputCustom.syncCloudStorage.storages[0]
      )
    })

    it('should limit sync to specified actions: upload & delete', async () => {
      const serverlessInputCustom = createValidInputFixture({
        patterns: sampleStoragePatterns.single,
        name: sampleStorage.name,
      })

      serverlessInputCustom.syncCloudStorage.storages[0].actions = [
        'upload',
        'delete',
      ]

      const mockServerless = getServerlessMock(serverlessInputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )
      await setupStorage(
        syncCloudStorage.getS3Client(),
        serverlessInputCustom.syncCloudStorage.storages[0]
      )

      const giraffeTXT = 'giraffe.txt'
      await syncCloudStorage.getS3Client().send(
        new PutObjectCommand({
          Bucket: serverlessInputCustom.syncCloudStorage.storages[0].name,
          Key: giraffeTXT,
          Body: 'giraffe',
        })
      )

      const syncStoragesSpy = jest.spyOn(syncCloudStorage, 'storages')
      const response = await syncCloudStorage.storages()

      expect(syncStoragesSpy).toHaveBeenCalledTimes(1)

      for (const result of response.result) {
        if (isFulfilledSyncResult(result)) {
          uploadedFilesExpects(result.value.storage, result.value.uploaded)
          deletedFilesExpects(result.value.deleted, { length: 2 })

          await deleteStorage(
            syncCloudStorage.getS3Client(),
            result.value.storage
          )
        }
      }
    })
  })
  describe('Multiple Storages', () => {
    it('should sync multiple storages with with all actions', async () => {
      const serverlessInputCustom = createValidInputFixture({
        patterns: sampleStoragePatterns.single,
        name: sampleStorage.name,
      })
      const serverlessInputCustom2 = createValidInputFixture({
        patterns: sampleStoragePatterns.multiple,
        name: 'giraffe-bucket-2',
      })
      const {
        syncCloudStorage: {
          storages: [storage1],
        },
      } = serverlessInputCustom
      const {
        syncCloudStorage: {
          storages: [storage2],
        },
      } = serverlessInputCustom2
      const storages = [storage1, storage2]
      const mockServerless = getServerlessMock(
        {
          ...serverlessInputCustom,
          syncCloudStorage: {
            ...serverlessInputCustom.syncCloudStorage,
            storages,
          },
        },
        cwd
      )
      const syncCloudStorage = new SyncCloudStorageServerless(
        mockServerless,
        optionsMock,
        loggingMock
      )

      await setupStorage(syncCloudStorage.getS3Client(), storages[0])
      await setupStorage(syncCloudStorage.getS3Client(), storages[1])

      const syncStoragesSpy = jest.spyOn(syncCloudStorage, 'storages')
      const response = await syncCloudStorage.storages()

      expect(syncStoragesSpy).toHaveBeenCalledTimes(1)

      for (const result of response.result) {
        if (isFulfilledSyncResult(result)) {
          uploadedFilesExpects(result.value.storage, result.value.uploaded)
          deletedFilesExpects(result.value.deleted, { length: 0 })

          await deleteStorage(
            syncCloudStorage.getS3Client(),
            result.value.storage
          )
        }
      }
    })
  })
})
