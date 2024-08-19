import path from 'path'

import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  DeletedObject,
  GetBucketTaggingCommand,
  GetBucketTaggingOutput,
  HeadObjectCommand,
  ListBucketsCommand,
  MetadataDirective,
  PutBucketAclCommand,
  PutBucketTaggingCommand,
  S3Client,
} from '@aws-sdk/client-s3'

import { deleteObjects, listObjects, uploadObjects } from './objects'
import { Storage } from '../../schemas/input'
import {
  StoragesSyncResult,
  SyncMetadataReturn,
  TagsSyncResult,
  UploadedObject,
} from '../../types'
import { logger } from '../../utils/logger'
import { getChecksum, getContentType } from '../../utils/objects'
import { mergeTags } from '../../utils/tags'
import { getLocalFiles } from '../local/objects'

export const storageExists = async (
  client: S3Client,
  name: string
): Promise<boolean> => {
  const storages = (await client.send(new ListBucketsCommand({}))).Buckets ?? []
  return storages.filter((storage) => storage.Name === name).length > 0
}

/**
 * Syncs storage with upload and delete actions
 * by comparing local file and storage's object `${Key}-${ETag}`.
 *
 * In case of defining metadata and tags, it will be synced.
 * @memberof S3
 * @param {S3Client} client
 * @param {Storage} storage
 * @param {string} cwd - Current working directory
 * @returns {SyncResult}
 */
export const sync = async (
  client: S3Client,
  storage: Storage,
  cwd: string
): Promise<StoragesSyncResult> => {
  const { name } = storage
  const storageExist = await storageExists(client, name)

  if (!storageExist) {
    throw new Error('StorageNotFound')
  }

  logger.info('Syncing storage', { storage: storage.name })

  const files = await getLocalFiles(storage.patterns, storage, cwd)
  const localFilesChecksum = files.map((file) =>
    getChecksum(file.key, file.etag)
  )

  const objects = await listObjects(client, storage)

  const storageObjectsChecksum = objects.map((object) =>
    getChecksum(object.Key, object.ETag)
  )

  const filesToUpload = localFilesChecksum.filter(
    (fileChecksum) => !storageObjectsChecksum.includes(fileChecksum)
  )

  const filesToDelete = storageObjectsChecksum.filter(
    (objectChecksum) => !localFilesChecksum.includes(objectChecksum)
  )

  let uploaded: UploadedObject[] = []
  let deleted: DeletedObject[] = []

  if (filesToUpload.length >= 1 && storage.actions.includes('upload')) {
    uploaded = await uploadObjects(client, storage, files, filesToUpload)
  }

  if (filesToDelete.length >= 1 && storage.actions.includes('delete')) {
    const objectsToDelete = objects.filter((object) =>
      filesToDelete.includes(getChecksum(object.Key, object.ETag))
    )

    deleted = await deleteObjects(client, storage, objectsToDelete)
  }

  const metadataResult =
    storage.metadata && (await syncMetadata(client, storage))

  const tagsResult = storage.tags && (await syncTags(client, storage))

  const result: StoragesSyncResult = {
    storage,
    files,
    objects,
    localFilesChecksum,
    storageObjectsChecksum,
    filesToUpload,
    filesToDelete,
    uploaded,
    deleted,
    metadata: metadataResult,
    tags: tagsResult,
  }

  return result
}

/**
 * Syncs storage's metadata.
 * @memberof S3
 * @param {S3Client} client
 * @param {Storage} storage
 * @returns {Promise<SyncMetadataReturn>}
 */
export const syncMetadata = async (
  client: S3Client,
  storage: Storage
): Promise<SyncMetadataReturn> => {
  const existingObjects = await listObjects(client, storage)
  const syncedMetadata = []

  for (const file of existingObjects) {
    logger.info("Syncing storage's metadata", {
      storage: storage.name,
      Key: file.Key,
    })

    const copyCommand = new CopyObjectCommand({
      Bucket: storage.name,
      Key: file.Key,
      CopySource: encodeURIComponent(`${storage.name}/${file.Key}`),
      ContentType: getContentType(file.Key),
      MetadataDirective: MetadataDirective.REPLACE,
      Metadata: storage.metadata,
      ACL: storage.acl,
    })

    const result = await client.send(copyCommand)

    logger.info('Metadata synced', {
      storage: storage.name,
      Key: file.Key,
      result,
    })

    const headCommand = await client.send(
      new HeadObjectCommand({
        Bucket: storage.name,
        Key: storage.prefix
          ? path.join(storage.prefix, `${file.Key}`)
          : file.Key,
      })
    )

    syncedMetadata.push({
      Key: file.Key,
      Bucket: storage.name,
      Metadata: headCommand.Metadata,
    })
  }

  return syncedMetadata
}

/**
 * Syncs storage's tags.
 * @memberof S3
 * @param {S3Client} client
 * @param {Storage} storage
 * @returns {TagsSyncResult}
 */
export const syncTags = async (
  client: S3Client,
  storage: Storage
): Promise<TagsSyncResult> => {
  logger.info("Syncing storage's tags", { storage: storage.name })

  const { name } = storage
  const storageExist = await storageExists(client, name)

  if (!storageExist) {
    return { error: new Error('StorageNotFound') }
  }

  let existingTagSet: GetBucketTaggingOutput = { TagSet: [] }

  try {
    try {
      const existingTagSetCommand = new GetBucketTaggingCommand({
        Bucket: storage.name,
      })
      existingTagSet = await client.send(existingTagSetCommand)
    } catch (error) {
      if ((error as Error).name === 'NoSuchTagSet') {
        existingTagSet = { TagSet: [] }
      } else {
        logger.error('Failed to get existing tags', {
          storage: storage.name,
          error: JSON.stringify(error),
        })
      }
    }

    const mergedTagSet = mergeTags(existingTagSet.TagSet, storage.tags ?? {})

    await client.send(
      new PutBucketTaggingCommand({
        Bucket: storage.name,
        Tagging: {
          TagSet: mergedTagSet,
        },
      })
    )

    logger.info("Synced storage's tags", {
      storage: storage.name,
      existingTagSet: existingTagSet.TagSet,
      newTagSet: storage.tags,
      mergedTagSet: mergedTagSet,
    })

    return { storage, result: mergedTagSet }
  } catch (error) {
    return { storage, error: JSON.stringify(error) }
  }
}

export const createStorage = async (
  client: S3Client,
  storage: Storage
): Promise<Storage> => {
  logger.info('Creating storage', { storage: storage.name })

  const createCommand = new CreateBucketCommand({
    Bucket: storage.name,
    ObjectLockEnabledForBucket: true,
    ObjectOwnership: 'BucketOwnerPreferred',
  })

  await client.send(createCommand)

  logger.info('Storage created', { storage: storage.name })

  const aclCommand = new PutBucketAclCommand({
    Bucket: storage.name,
    ACL: 'private',
  })

  await client.send(aclCommand)

  logger.info('Storage ACL enabled', { storage: storage.name })

  return storage
}

export const deleteStorage = async (
  client: S3Client,
  storage: Storage
): Promise<DeletedObject[]> => {
  logger.info('Deleting storage', { storage: storage.name })

  const objects = await listObjects(client, storage)
  const deletedObjects = await deleteObjects(client, storage, objects)

  await client.send(
    new DeleteBucketCommand({
      Bucket: storage.name,
    })
  )

  logger.info('Storage deleted', { storage: storage.name })

  return deletedObjects
}
