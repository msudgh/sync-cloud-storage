import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
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
} from './schemas/input.fixture'
import { setupEnvs } from './setupEnvs'
import SyncCloudStorage from '../src'
import { InvalidConfigError } from '../src/errors'
import { createStorage, deleteStorage } from '../src/providers/s3/buckets'
import * as objects from '../src/providers/s3/objects'
import { Storage } from '../src/schemas/input'
import { LocalFile, TagsMethodPromiseResult } from '../src/types'
import logger from '../src/utils/logger'
import { mergeTags } from '../src/utils/tags'

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

describe('SyncCloudStorage', () => {
  beforeAll(async () => {
    await setupEnvs()
  })

  describe('Constructor Related Tests', () => {
    it('should properly configure S3 client for offline mode', async () => {
      const inputCustom = createValidInputFixture(
        './assets/giraffe',
        sampleStorage.name
      )
      const mockServerless = getServerlessMock(inputCustom, __dirname)
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
      const mockServerless = getServerlessMock(inputCustom, __dirname)
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
        './assets/giraffe',
        sampleStorage.name
      )
      inputCustom.syncCloudStorage.storages = []
      const mockServerless = getServerlessMock(inputCustom, __dirname)

      try {
        new SyncCloudStorage(mockServerless, optionsMock, loggingMock)
      } catch (error) {
        const typedError = error as InvalidConfigError
        expect(typedError).toBeInstanceOf(InvalidConfigError)
        expect(typedError.name).toEqual('InvalidConfigError')
      }
    })
  })

  describe('Storage Related Tests', () => {
    it("should throw an error when the bucket doesn't exist", async () => {
      const inputCustom = createValidInputFixture(
        './assets/giraffe',
        'non-existent-bucket'
      )
      const mockServerless = getServerlessMock(inputCustom, __dirname)
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

    it('should sync when there is a new bucket and acl set to bucket owner', async () => {
      const inputCustom = createValidInputFixtureWithACLBucketOwner(
        './assets/giraffe',
        sampleStorage.name
      )
      const mockServerless = getServerlessMock(inputCustom, __dirname)
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

      const giraffeREADME = 'README.md'

      const expectedResponse = {
        result: [
          {
            status: 'fulfilled',
            value: {
              files: [
                {
                  Key: giraffeREADME,
                  LocalPath: expect.any(String),
                  ETag: expect.any(String),
                  LastModified: expect.any(Date),
                  Size: expect.any(Number),
                },
              ],
              filesToDelete: [],
              filesToUpload: [expect.any(String)],
              localFilesChecksum: [expect.any(String)],
              objects: [],
              storage: inputCustom.syncCloudStorage.storages[0],
              storageObjectsChecksum: [],
              uploaded: [
                {
                  storage: inputCustom.syncCloudStorage.storages[0].name,
                  etag: expect.any(String),
                  key: giraffeREADME,
                  location: expect.any(String),
                  versionId: expect.any(String),
                },
              ],
              deleted: [],
            },
          },
        ],
      }

      expect(response).toEqual(expectedResponse)

      await deleteStorage(
        syncCloudStorage.getS3Client(),
        inputCustom.syncCloudStorage.storages[0]
      )
    })

    it('should sync when the prefix', async () => {
      const prefix = 'animals'
      const inputCustom = createValidInputFixture(
        './assets/giraffe',
        sampleStorage.name,
        prefix
      )
      const mockServerless = getServerlessMock(inputCustom, __dirname)
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

      const giraffeREADME = 'README.md'
      const expectedResponse = {
        result: [
          {
            status: 'fulfilled',
            value: {
              files: [
                {
                  Key: expect.stringMatching(
                    new RegExp(`${prefix}/${giraffeREADME}`)
                  ),
                  LocalPath: expect.any(String),
                  ETag: expect.any(String),
                  LastModified: expect.any(Date),
                  Size: expect.any(Number),
                },
              ],
              filesToDelete: [],
              filesToUpload: [expect.any(String)],
              localFilesChecksum: [expect.any(String)],
              objects: [],
              storage: inputCustom.syncCloudStorage.storages[0],
              storageObjectsChecksum: [],
              uploaded: [
                {
                  storage: inputCustom.syncCloudStorage.storages[0].name,
                  etag: expect.any(String),
                  key: expect.stringMatching(
                    new RegExp(`${prefix}/${giraffeREADME}`)
                  ),
                  location: expect.any(String),
                  versionId: expect.any(String),
                },
              ],
              deleted: [],
            },
          },
        ],
      }

      expect(response).toEqual(expectedResponse)

      for (const syncedStorage of response.result) {
        if (syncedStorage.status === 'rejected') {
          throw syncedStorage.reason
        }

        await deleteStorage(
          syncCloudStorage.getS3Client(),
          syncedStorage.value.storage
        )
      }
    })

    it('should sync tags', async () => {
      const inputCustom = createValidInputFixtureWithTags(
        './assets/giraffe',
        sampleStorage.name
      )
      const mockServerless = getServerlessMock(inputCustom, __dirname)
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
      const mockServerless = getServerlessMock(inputCustom, __dirname)
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

    it("should not sync tags when storage doesn't exist", async () => {
      const inputCustom = createValidInputFixture(
        './assets/giraffe',
        'non-existent-bucket'
      )
      const mockServerless = getServerlessMock(inputCustom, __dirname)
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

    it('should sync metadata', async () => {
      const inputCustom = createValidInputFixtureWithMetadata(
        './assets/giraffe',
        sampleStorage.name
      )
      const mockServerless = getServerlessMock(inputCustom, __dirname)
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

    it('should limit sync to specified actions: upload', async () => {
      const inputCustom = createValidInputFixture(
        './assets/giraffe',
        sampleStorage.name
      )
      inputCustom.syncCloudStorage.storages[0].actions = ['upload']
      const mockServerless = getServerlessMock(inputCustom, __dirname)

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
      const giraffeREADME = 'README.md'

      expect(syncStoragesSpy).toHaveBeenCalledTimes(1)

      const expectedFile = expect.objectContaining<LocalFile>({
        ETag: expect.any(String),
        Key: giraffeREADME,
        LastModified: expect.any(Date),
        LocalPath: expect.stringContaining(giraffeREADME),
        Size: expect.any(Number),
      })

      const expectedResponse = {
        result: [
          {
            status: 'fulfilled',
            value: {
              deleted: expect.arrayContaining([]),
              files: expect.arrayContaining([expectedFile]),
              filesToDelete: expect.arrayContaining([]),
              filesToUpload: expect.arrayContaining([
                expect.stringContaining(giraffeREADME),
              ]),
              localFilesChecksum: expect.arrayContaining([
                expect.stringContaining(giraffeREADME),
              ]),
              objects: expect.arrayContaining([]),
              storage: inputCustom.syncCloudStorage.storages[0],
              storageObjectsChecksum: expect.arrayContaining([]),
              uploaded: [
                {
                  storage: inputCustom.syncCloudStorage.storages[0].name,
                  etag: expect.any(String),
                  key: giraffeREADME,
                  location: expect.any(String),
                  versionId: expect.any(String),
                },
              ],
            },
          },
        ],
      }

      expect(response).toEqual(expectedResponse)

      await deleteStorage(
        syncCloudStorage.getS3Client(),
        inputCustom.syncCloudStorage.storages[0]
      )
    })

    it('should limit sync to specified actions: delete', async () => {
      const inputCustom = createValidInputFixture(
        './assets/giraffe',
        sampleStorage.name
      )

      inputCustom.syncCloudStorage.storages[0].actions = ['delete']

      const mockServerless = getServerlessMock(inputCustom, __dirname)
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
        './assets/giraffe',
        sampleStorage.name
      )

      inputCustom.syncCloudStorage.storages[0].actions = ['upload', 'delete']

      const mockServerless = getServerlessMock(inputCustom, __dirname)
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

      const giraffeREADME = 'README.md'

      const expectedFile = expect.objectContaining<LocalFile>({
        ETag: expect.any(String),
        Key: giraffeREADME,
        LastModified: expect.any(Date),
        LocalPath: expect.stringContaining('README.md'),
        Size: expect.any(Number),
      })

      const expectedGiraffeTXTObject = expect.objectContaining({
        ETag: expect.any(String),
        Key: giraffeTXT,
        LastModified: expect.any(Date),
        Size: expect.any(Number),
        StorageClass: expect.any(String),
      })

      const expectedResponse = {
        result: [
          {
            status: 'fulfilled',
            value: {
              deleted: expect.arrayContaining([
                {
                  Key: giraffeTXT,
                  VersionId: expect.any(String),
                },
                {
                  Key: expect.stringMatching(giraffeREADME),
                  VersionId: expect.any(String),
                },
              ]),
              files: [expectedFile],
              filesToDelete: [expect.stringMatching(giraffeTXT)],
              filesToUpload: [expect.stringMatching(giraffeREADME)],
              localFilesChecksum: [expect.stringMatching(giraffeREADME)],
              objects: [expectedGiraffeTXTObject],
              storage: inputCustom.syncCloudStorage.storages[0],
              storageObjectsChecksum: [expect.stringMatching(giraffeTXT)],
              uploaded: [
                {
                  storage: inputCustom.syncCloudStorage.storages[0].name,
                  etag: expect.any(String),
                  key: expect.stringMatching(giraffeREADME),
                  location: expect.any(String),
                  versionId: expect.any(String),
                },
              ],
            },
          },
        ],
      }

      expect(response).toEqual(expectedResponse)

      await deleteStorage(
        syncCloudStorage.getS3Client(),
        inputCustom.syncCloudStorage.storages[0]
      )
    })

    it('should sync multiple storages with with all actions', async () => {
      const inputCustom = createValidInputFixture(
        './assets/giraffe',
        sampleStorage.name
      )
      const inputCustom2 = createValidInputFixture(
        './assets/giraffe-multiple',
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
        __dirname
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

      const giraffeReadme = 'README.md'
      const giraffeSubReadme = 'sub/README.md'
      const expectedReadmeLocalFile = expect.objectContaining<LocalFile>({
        ETag: expect.any(String),
        Key: giraffeReadme,
        LastModified: expect.any(Date),
        LocalPath: expect.stringMatching(giraffeReadme),
        Size: expect.any(Number),
      })
      const expectedSubReadmeLocalFile = expect.objectContaining<LocalFile>({
        ETag: expect.any(String),
        Key: giraffeSubReadme,
        LastModified: expect.any(Date),
        LocalPath: expect.stringMatching(giraffeReadme),
        Size: expect.any(Number),
      })
      const expectedUploadedReadmeFile1 = expect.objectContaining({
        storage: storage1.name,
        etag: expect.any(String),
        key: giraffeReadme,
        location: expect.any(String),
        versionId: expect.any(String),
      })
      const expectedUploadedReadmeFile2 = expect.objectContaining({
        storage: storage2.name,
        etag: expect.any(String),
        key: giraffeReadme,
        location: expect.any(String),
        versionId: expect.any(String),
      })
      const expectedUploadedSubReadmeFile2 = expect.objectContaining({
        storage: storage2.name,
        etag: expect.any(String),
        key: giraffeSubReadme,
        location: expect.any(String),
        versionId: expect.any(String),
      })

      const expectedResponse = {
        result: [
          {
            status: 'fulfilled',
            value: {
              deleted: expect.arrayContaining([]),
              files: [expectedReadmeLocalFile],
              filesToDelete: expect.arrayContaining([]),
              filesToUpload: expect.arrayContaining([
                expect.stringContaining(giraffeReadme),
              ]),
              localFilesChecksum: expect.arrayContaining([
                expect.stringContaining(giraffeReadme),
              ]),
              objects: expect.arrayContaining([]),
              storage: storages[0],
              storageObjectsChecksum: expect.arrayContaining([]),
              uploaded: [expectedUploadedReadmeFile1],
            },
          },
          {
            status: 'fulfilled',
            value: {
              deleted: expect.arrayContaining([]),
              files: [expectedReadmeLocalFile, expectedSubReadmeLocalFile],
              filesToDelete: expect.arrayContaining([]),
              filesToUpload: expect.arrayContaining([
                expect.stringContaining(giraffeReadme),
              ]),
              localFilesChecksum: expect.arrayContaining([
                expect.stringContaining(giraffeReadme),
              ]),
              objects: expect.arrayContaining([]),
              storage: storages[1],
              storageObjectsChecksum: expect.arrayContaining([]),
              uploaded: [
                expectedUploadedReadmeFile2,
                expectedUploadedSubReadmeFile2,
              ],
            },
          },
        ],
      }

      expect(response).toEqual(expectedResponse)

      for (const storage of storages) {
        await deleteStorage(syncCloudStorage.getS3Client(), storage)
      }
    })
  })
})
