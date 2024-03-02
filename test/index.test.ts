import { DeletedObject, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { mock } from 'jest-mock-extended'
import { Options } from 'serverless'
import { Logging } from 'serverless/classes/Plugin'

import { getServerlessMock } from './mocks/serverless'
import {
  createValidDisabledInputFixture,
  createValidInputFixture,
  createValidInputFixtureWithACLBucketOwner,
  createValidInputFixtureWithMetadata,
  createValidInputFixtureWithTags,
  sampleStorage,
  sampleStoragePatterns,
} from './schemas/input.fixture'
import { setupAWSEnvs } from './setupAWSEnvs'
import { InvalidConfigError } from '../src/errors'
import SyncCloudStorage from '../src/index'
import { createStorage, deleteStorage } from '../src/providers/s3/buckets'
import * as objects from '../src/providers/s3/objects'
import { Storage } from '../src/schemas/input'
import {
  TagsMethodPromiseResult,
  UploadedObject,
  isFulfilledSyncResult,
} from '../src/types'
import logger from '../src/utils/logger'
import { mergeTags } from '../src/utils/tags'

const cwd = process.cwd()
const optionsMock = mock<Options>()
const loggingMock = mock<Logging>()

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

describe('SyncCloudStorage', () => {
  beforeAll(async () => {
    await setupAWSEnvs()
  })

  describe('Constructor Related Tests', () => {
    it('should properly configure S3 client for offline mode', async () => {
      const inputCustom = createValidInputFixture(
        sampleStoragePatterns.single,
        sampleStorage.name
      )
      const mockServerless = getServerlessMock(inputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )

      expect(syncCloudStorage.client).toBeInstanceOf(S3Client)

      if (
        inputCustom.syncCloudStorage.offline === true &&
        inputCustom.syncCloudStorage.endpoint !== undefined
      ) {
        const configuredEndpoint =
          await syncCloudStorage.client?.config?.endpoint?.()

        expect(
          inputCustom.syncCloudStorage.endpoint.includes(
            `${configuredEndpoint?.hostname}`
          )
        ).toBe(true)
        expect(
          inputCustom.syncCloudStorage.endpoint.includes(
            `${configuredEndpoint?.port}`
          )
        ).toBe(true)
      }
    })

    it('should not sync when plugin is disabled', async () => {
      const inputCustom = createValidDisabledInputFixture()
      const mockServerless = getServerlessMock(inputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )
      const syncStoragesSpy = jest.spyOn(syncCloudStorage, 'storages')
      const response = await syncCloudStorage.storages()

      expect(syncStoragesSpy).toHaveBeenCalledTimes(1)
      expect(response).toEqual({ result: [] })
    })

    it("should not sync when there's no bucket", async () => {
      const inputCustom = createValidInputFixture(
        sampleStoragePatterns.single,
        sampleStorage.name
      )
      inputCustom.syncCloudStorage.storages = []
      const mockServerless = getServerlessMock(inputCustom, cwd)

      try {
        new SyncCloudStorage(mockServerless, optionsMock, loggingMock)
      } catch (error) {
        const typedError = error as InvalidConfigError
        expect(typedError).toBeInstanceOf(InvalidConfigError)
        expect(typedError.name).toEqual('InvalidConfigError')
      }
    })
  })

  describe('Error Handling', () => {
    it("should throw an error when the bucket doesn't exist", async () => {
      const inputCustom = createValidInputFixture(
        sampleStoragePatterns.single,
        'non-existent-bucket'
      )
      const mockServerless = getServerlessMock(inputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorage(
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
      const inputCustom = createValidInputFixture(
        sampleStoragePatterns.single,
        'non-existent-bucket'
      )
      const mockServerless = getServerlessMock(inputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorage(
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
      const inputCustom = createValidInputFixtureWithACLBucketOwner(
        sampleStoragePatterns.single,
        sampleStorage.name
      )
      const mockServerless = getServerlessMock(inputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )

      await setupStorage(
        syncCloudStorage.getS3Client(),
        inputCustom.syncCloudStorage.storages[0]
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
    it('should sync when the prefix', async () => {
      const prefix = 'animals'
      const inputCustom = createValidInputFixture(
        sampleStoragePatterns.single,
        sampleStorage.name,
        prefix
      )
      const mockServerless = getServerlessMock(inputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )
      await setupStorage(
        syncCloudStorage.getS3Client(),
        inputCustom.syncCloudStorage.storages[0]
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
      const inputCustom = createValidInputFixtureWithTags(
        sampleStoragePatterns.single,
        sampleStorage.name
      )
      const mockServerless = getServerlessMock(inputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )
      await setupStorage(
        syncCloudStorage.getS3Client(),
        inputCustom.syncCloudStorage.storages[0]
      )

      const expectedTags = mergeTags(
        [],
        inputCustom.syncCloudStorage.storages[0].tags
      )
      const tagsSpy = jest.spyOn(syncCloudStorage, 'tags')
      const newTags = await syncCloudStorage.tags()

      expect(tagsSpy).toHaveBeenCalledTimes(1)

      for (const newTag of newTags) {
        const { status, value } = newTag as TagsMethodPromiseResult
        const { result, error, storage } = value

        expect(status).toBe('fulfilled')
        expect(error).toBe(undefined)
        expect(storage).toEqual(inputCustom.syncCloudStorage.storages[0])
        expect(result).toEqual(expectedTags)
        expect(result?.length).toBeGreaterThanOrEqual(1)

        expect(
          await deleteStorage(
            syncCloudStorage.getS3Client(),
            inputCustom.syncCloudStorage.storages[0]
          )
        ).not.toBe(undefined)
      }
    })

    it('should not sync tags when plugin is disabled', async () => {
      const inputCustom = createValidDisabledInputFixture()
      const mockServerless = getServerlessMock(inputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorage(
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
      const inputCustom = createValidInputFixtureWithMetadata(
        sampleStoragePatterns.single,
        sampleStorage.name
      )
      const mockServerless = getServerlessMock(inputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )
      await setupStorage(
        syncCloudStorage.getS3Client(),
        inputCustom.syncCloudStorage.storages[0]
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
              Metadata: inputCustom.syncCloudStorage.storages[0].metadata,
              Bucket: inputCustom.syncCloudStorage.storages[0].name,
            }
          }),
        }),
      ])

      expect(metadataSpy).toHaveBeenCalledTimes(1)
      expect(syncedStorages).toEqual(expectedResponse)

      await deleteStorage(
        syncCloudStorage.getS3Client(),
        inputCustom.syncCloudStorage.storages[0]
      )
    })
  })

  describe('Action Limitation', () => {
    it('should limit sync to specified actions: upload', async () => {
      const inputCustom = createValidInputFixture(
        sampleStoragePatterns.single,
        sampleStorage.name
      )
      inputCustom.syncCloudStorage.storages[0].actions = ['upload']
      const mockServerless = getServerlessMock(inputCustom, cwd)

      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )
      await setupStorage(
        syncCloudStorage.getS3Client(),
        inputCustom.syncCloudStorage.storages[0]
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
      const inputCustom = createValidInputFixture(
        sampleStoragePatterns.single,
        sampleStorage.name
      )

      inputCustom.syncCloudStorage.storages[0].actions = ['delete']

      const mockServerless = getServerlessMock(inputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )
      await setupStorage(
        syncCloudStorage.getS3Client(),
        inputCustom.syncCloudStorage.storages[0]
      )

      const giraffeTXT = 'giraffe.txt'
      await syncCloudStorage.getS3Client().send(
        new PutObjectCommand({
          Bucket: inputCustom.syncCloudStorage.storages[0].name,
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
              storage: inputCustom.syncCloudStorage.storages[0],
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
        inputCustom.syncCloudStorage.storages[0]
      )
    })

    it('should limit sync to specified actions: upload & delete', async () => {
      const inputCustom = createValidInputFixture(
        sampleStoragePatterns.single,
        sampleStorage.name
      )

      inputCustom.syncCloudStorage.storages[0].actions = ['upload', 'delete']

      const mockServerless = getServerlessMock(inputCustom, cwd)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )
      await setupStorage(
        syncCloudStorage.getS3Client(),
        inputCustom.syncCloudStorage.storages[0]
      )

      const giraffeTXT = 'giraffe.txt'
      await syncCloudStorage.getS3Client().send(
        new PutObjectCommand({
          Bucket: inputCustom.syncCloudStorage.storages[0].name,
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
      const inputCustom = createValidInputFixture(
        sampleStoragePatterns.single,
        sampleStorage.name
      )
      const inputCustom2 = createValidInputFixture(
        sampleStoragePatterns.multiple,
        'giraffe-bucket-2'
      )
      const {
        syncCloudStorage: {
          storages: [storage1],
        },
      } = inputCustom
      const {
        syncCloudStorage: {
          storages: [storage2],
        },
      } = inputCustom2
      const storages = [storage1, storage2]
      const mockServerless = getServerlessMock(
        {
          ...inputCustom,
          syncCloudStorage: { ...inputCustom.syncCloudStorage, storages },
        },
        cwd
      )
      const syncCloudStorage = new SyncCloudStorage(
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
