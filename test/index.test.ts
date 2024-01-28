import { S3Client } from '@aws-sdk/client-s3'
import { mock } from 'jest-mock-extended'
import { Options } from 'serverless'
import { Logging } from 'serverless/classes/Plugin'

import { getServerlessMock } from './mocks/serverless'
import {
  createValidDisabledInputFixture,
  createValidOfflineInputFixture,
  createValidOnlineInputFixture,
  createValidOnlineInputFixtureWithMetadata,
  createValidOnlineInputFixtureWithTags,
  sampleStorage,
  sampleStorageName,
} from './schemas/input.fixture'
import { setupEnvs } from './setupEnvs'
import SyncCloudStorage from '../src'
import { InvalidConfigError } from '../src/errors'
import { createStorage, deleteStorage } from '../src/providers/s3/buckets'
import { mergeTags } from '../src/utils/tags'

const optionsMock = mock<Options>()
const loggingMock = mock<Logging>()

describe('SyncCloudStorage ', () => {
  beforeEach(async () => {
    await setupEnvs()
  })

  describe('Constructor Related Tests', () => {
    it('should properly configure S3 client for offline mode', async () => {
      const customEndpoint = 'http://localhost:4569'
      const offlineInputCustom = createValidOfflineInputFixture(customEndpoint)
      const mockServerless = getServerlessMock(offlineInputCustom, __dirname)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )

      expect(syncCloudStorage.client).toBeInstanceOf(S3Client)

      if (process.env.IS_OFFLINE === 'true' && customEndpoint !== undefined) {
        const configuredEndpoint =
          await syncCloudStorage.client?.config?.endpoint?.()
        console.log('configuredEndpoint', configuredEndpoint)
        expect(customEndpoint.includes(`${configuredEndpoint?.hostname}`)).toBe(
          true
        )
        expect(customEndpoint.includes(`${configuredEndpoint?.port}`)).toBe(
          true
        )
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
      const bucketsSpy = jest.spyOn(syncCloudStorage, 'storages')
      const response = await syncCloudStorage.storages()

      expect(bucketsSpy).toHaveBeenCalledTimes(1)
      expect(response).toMatchObject(
        expect.objectContaining({ result: expect.arrayContaining([]) })
      )
    })

    it("should not sync when there's no bucket", async () => {
      const inputCustom = createValidOnlineInputFixture(
        './assets/giraffe',
        sampleStorageName
      )
      inputCustom.syncCloudStorage.storages = []
      const mockServerless = getServerlessMock(inputCustom, __dirname)

      try {
        const syncCloudStorage = new SyncCloudStorage(
          mockServerless,
          optionsMock,
          loggingMock
        )

        await createStorage(syncCloudStorage.getS3Client(), sampleStorage)

        const bucketsSpy = jest.spyOn(syncCloudStorage, 'storages')
        await syncCloudStorage.storages()
        expect(bucketsSpy).toHaveBeenCalledTimes(1)

        await deleteStorage(syncCloudStorage.getS3Client(), sampleStorage)
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidConfigError)
      }
    })
  })

  describe('Storage Related Tests', () => {
    it("should throw an error when the bucket doesn't exist", async () => {
      const inputCustom = createValidOnlineInputFixture(
        './assets/giraffe',
        'non-existent-bucket'
      )
      const mockServerless = getServerlessMock(inputCustom, __dirname)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )

      await createStorage(syncCloudStorage.getS3Client(), sampleStorage)

      try {
        const bucketsSpy = jest.spyOn(syncCloudStorage, 'storages')
        await syncCloudStorage.storages()
        expect(bucketsSpy).toHaveBeenCalledTimes(1)
      } catch (error) {
        expect(error).toBe(
          `Error/Storage doesn't exist!: ${inputCustom.syncCloudStorage.storages[0].name}`
        )
      }
    })

    it('should sync when there are buckets', async () => {
      const inputCustom = createValidOnlineInputFixture(
        './assets/giraffe',
        sampleStorageName
      )
      const mockServerless = getServerlessMock(inputCustom, __dirname)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )

      await createStorage(syncCloudStorage.getS3Client(), sampleStorage)

      const bucketsSpy = jest.spyOn(syncCloudStorage, 'storages')
      const response = await syncCloudStorage.storages()
      expect(bucketsSpy).toHaveBeenCalledTimes(1)
      expect(response).toMatchObject({
        result: expect.arrayContaining([
          expect.objectContaining({
            status: expect.stringContaining('fulfilled'),
            value: expect.objectContaining({
              uploaded: expect.arrayContaining([
                expect.objectContaining({
                  Bucket: expect.stringContaining(sampleStorageName),
                }),
              ]),
            }),
          }),
        ]),
      })
      await deleteStorage(syncCloudStorage.getS3Client(), sampleStorage)
    })

    it('should sync when the bucketPrefix', async () => {
      const bucketPrefix = 'animals'
      const inputCustom = createValidOnlineInputFixture(
        './assets/giraffe',
        sampleStorageName,
        bucketPrefix
      )
      const mockServerless = getServerlessMock(inputCustom, __dirname)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )

      await createStorage(syncCloudStorage.getS3Client(), sampleStorage)

      const bucketsSpy = jest.spyOn(syncCloudStorage, 'storages')
      const response = await syncCloudStorage.storages()
      expect(bucketsSpy).toHaveBeenCalledTimes(1)
      expect(response).toMatchObject({
        result: expect.arrayContaining([
          expect.objectContaining({
            status: expect.stringContaining('fulfilled'),
            value: expect.objectContaining({
              uploaded: expect.arrayContaining([
                expect.objectContaining({
                  Key: expect.stringContaining(bucketPrefix),
                }),
              ]),
            }),
          }),
        ]),
      })

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
      const inputCustom = createValidOnlineInputFixtureWithTags(
        './assets/giraffe',
        sampleStorageName
      )
      const mockServerless = getServerlessMock(inputCustom, __dirname)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )

      await createStorage(syncCloudStorage.getS3Client(), sampleStorage)

      const expectedTags = mergeTags(
        [],
        inputCustom.syncCloudStorage.storages[0].tags
      )
      const tagsSpy = jest.spyOn(syncCloudStorage, 'tags')
      const newTags = await syncCloudStorage.tags()
      expect(tagsSpy).toHaveBeenCalledTimes(1)

      for (const { result } of newTags) {
        expect(result).toBe(expectedTags)
        expect(result).toBeGreaterThanOrEqual(1)

        expect(
          await deleteStorage(syncCloudStorage.getS3Client(), sampleStorage)
        ).not.toBe(undefined)
      }
    })

    it('should sync metadata', async () => {
      const inputCustom = createValidOnlineInputFixtureWithMetadata(
        './assets/giraffe',
        sampleStorageName
      )
      const mockServerless = getServerlessMock(inputCustom, __dirname)
      const syncCloudStorage = new SyncCloudStorage(
        mockServerless,
        optionsMock,
        loggingMock
      )

      await createStorage(syncCloudStorage.getS3Client(), sampleStorage)

      const metadataSpy = jest.spyOn(syncCloudStorage, 'metadata')
      const syncedStorages = await syncCloudStorage.metadata()

      expect(metadataSpy).toHaveBeenCalledTimes(1)
      expect(syncedStorages).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            status: expect.stringContaining('fulfilled'),
            value: expect.arrayContaining([]),
          }),
        ])
      )

      await deleteStorage(syncCloudStorage.getS3Client(), sampleStorage)
    })
  })
})
