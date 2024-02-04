import path from 'path'

import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  DeletedObject,
  GetBucketTaggingCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  MetadataDirective,
  PutBucketAclCommand,
  PutBucketTaggingCommand,
  S3Client,
  _Object,
} from '@aws-sdk/client-s3'
import { lookup } from 'mrmime'

import { deleteObjects, listObjects, uploadObjects } from './objects'
import { Storage } from '../../schemas/input'
import {
  StoragesSyncResult,
  SyncMetadataReturn,
  TagsSyncResult,
} from '../../types'
import { getChecksum } from '../../utils/objects'
import { mergeTags } from '../../utils/tags'
import { getLocalFiles } from '../local/objects'

export const storageExists = async (
  client: S3Client,
  name: string
): Promise<boolean> => {
  try {
    const storages =
      (await client.send(new ListBucketsCommand({}))).Buckets ?? []
    return storages.filter((storage) => storage.Name === name).length > 0
  } catch (error) {
    return false
  }
}

/**
 * Syncs storage with upload and delete actions by comparing local file and storage's object checksums.
 * @memberof S3
 * @param {S3Client} client
 * @param {Storage} storage
 * @param {string} servicePath - Root directory of the service
 * @returns {SyncResult}
 */
export const sync = async (
  client: S3Client,
  storage: Storage,
  servicePath: string
): Promise<StoragesSyncResult> => {
  const { name } = storage
  const storageExist = await storageExists(client, name)

  if (!storageExist) {
    throw new Error('StorageNotFound')
  }

  console.log('Syncing storage', { storage: storage.name })

  const files = await getLocalFiles(
    path.join(servicePath, storage.localPath),
    storage
  )
  const localFilesChecksum = files.map((file) =>
    getChecksum(file.Key, file.ETag)
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

  let uploaded: _Object[] = []
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
  // Get list of existing objects
  const existingObjects = await listObjects(client, storage)
  const syncedMetadata = []

  for (const file of existingObjects) {
    console.log("Syncing storage's metadata", {
      storage: storage.name,
      Key: file.Key,
    })

    const detectedContentType =
      lookup(file.Key as string) ?? storage.defaultContentType

    const copyCommand = new CopyObjectCommand({
      Bucket: storage.name,
      Key: file.Key,
      CopySource: encodeURIComponent(`${storage.name}/${file.Key}`),
      ContentType: detectedContentType,
      MetadataDirective: MetadataDirective.REPLACE,
      Metadata: storage.metadata,
    })

    const result = await client.send(copyCommand)

    console.log('Metadata synced', {
      storage: storage.name,
      Key: file.Key,
      result,
    })

    // Get Object metadata
    const headCommand = await client.send(
      new HeadObjectCommand({
        Bucket: storage.name,
        Key: storage.bucketPrefix
          ? path.join(storage.bucketPrefix, `${file.Key}`)
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
  console.log("Syncing storage's tags", { storage: storage.name })

  try {
    const existingTagSetCommand = new GetBucketTaggingCommand({
      Bucket: storage.name,
    })
    const existingTagSet = await client.send(existingTagSetCommand)
    const mergedTagSet = mergeTags(existingTagSet.TagSet, storage.tags ?? {})

    const command = new PutBucketTaggingCommand({
      Bucket: storage.name,
      Tagging: {
        TagSet: mergedTagSet,
      },
    })

    await client.send(command)

    console.log("Synced storage's tags", {
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
  console.log('Creating storage', { storage: storage.name })

  const createCommand = new CreateBucketCommand({
    Bucket: storage.name,
    ObjectLockEnabledForBucket: true,
    ObjectOwnership: 'BucketOwnerPreferred',
  })

  await client.send(createCommand)

  console.log('Storage created', { storage: storage.name })

  const aclCommand = new PutBucketAclCommand({
    Bucket: storage.name,
    ACL: 'private',
  })

  await client.send(aclCommand)

  console.log('Storage ACL enabled', { storage: storage.name })

  return storage
}

export const deleteStorage = async (
  client: S3Client,
  storage: Storage
): Promise<DeletedObject[]> => {
  console.log('Deleting storage', { storage: storage.name })

  const objects = await listObjects(client, storage)
  const deletedObjects = await deleteObjects(client, storage, objects)

  await client.send(
    new DeleteBucketCommand({
      Bucket: storage.name,
    })
  )

  console.log('Storage deleted', { storage: storage.name })

  return deletedObjects
}
