import fs from 'fs'

import {
  DeleteObjectsCommand,
  DeletedObject,
  ListObjectVersionsCommand,
  ListObjectsV2Command,
  S3Client,
  _Object,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

import { Storage } from '../../schemas/input'
import { LocalFile } from '../../types'
import logger from '../../utils/logger'
import { getChecksum, getContentType } from '../../utils/objects'

/**
 * Lists all objects in a bucket.
 * @memberof S3
 * @param {S3Client} client
 * @param {Storage} storage
 * @returns {Promise<_Object[]>}
 */
export const listObjects = async (
  client: S3Client,
  storage: Storage
): Promise<_Object[]> => {
  logger.info('List objects in bucket', {
    name: storage.name,
  })

  const command = new ListObjectsV2Command({
    Bucket: storage.name,
  })

  const { Contents: contents = [] } = await client.send(command)

  logger.info('Storage objects', {
    storage: storage.name,
    storageContents: contents,
  })

  return contents
}

/**
 * Uploads objects to a bucket.
 * @memberof S3
 * @param {S3Client} client
 * @param {Storage} storage
 * @param {LocalFile[]} localFiles
 * @param {string[]} filesToUpload
 */
export const uploadObjects = async (
  client: S3Client,
  storage: Storage,
  localFiles: LocalFile[],
  filesToUpload: string[]
) => {
  const uploadedObjects = []

  for (const checksum of filesToUpload) {
    const fileToUpload = localFiles.find(
      (file) => getChecksum(file.Key, file.ETag) === checksum
    )

    if (!fileToUpload) {
      continue
    }

    logger.info('Upload file to bucket', {
      storage: storage.name,
      key: fileToUpload.Key,
      checksum,
    })

    const command = new Upload({
      client,
      params: {
        Bucket: storage.name,
        Key: fileToUpload.Key,
        Body: fs.createReadStream(fileToUpload.LocalPath),
        ContentType: getContentType(fileToUpload.Key),
        ACL: storage.acl,
      },
    })

    logger.info('Uploaded file to bucket', {
      storage: storage.name,
      Key: fileToUpload.Key,
    })

    const result = await command.done()

    uploadedObjects.push({
      key: result.Key,
      etag: result.ETag,
      versionId: result.VersionId,
      storage: result.Bucket,
      location: result.Location,
    })
  }

  return uploadedObjects
}

/**
 * Deletes objects from a bucket.
 * @memberof S3
 * @param {S3Client} client
 * @param {Storage} storage
 * @param {_Object[]} objects
 * @returns {Promise<DeletedObject[]>}
 */
export const deleteObjects = async (
  client: S3Client,
  storage: Storage,
  objects: _Object[],
  retry = 0
): Promise<DeletedObject[]> => {
  const keys = [...objects].map((object) => object.Key as string)

  logger.info('Delete following objects from bucket', {
    storage: storage.name,
    keys,
  })

  try {
    const versions = await client.send(
      new ListObjectVersionsCommand({
        Bucket: storage.name,
        Prefix: storage.prefix ? storage.prefix : undefined,
        MaxKeys: 1000000000,
      })
    )

    const deleteMarkers = (versions.DeleteMarkers ?? []).map((marker) => ({
      Key: marker.Key,
      VersionId: marker.VersionId,
    }))

    const versionsToDelete = (versions.Versions ?? []).map((version) => ({
      Key: version.Key,
      VersionId: version.VersionId,
    }))

    const objectsToDelete = [
      ...objects.map((object) => ({
        Key: object.Key,
        VersionId: object.ETag,
      })),
      ...deleteMarkers,
      ...versionsToDelete,
    ]

    if (objectsToDelete.length > 0) {
      const { Deleted: deleted = [] } = await client.send(
        new DeleteObjectsCommand({
          Bucket: storage.name,
          Delete: {
            Objects: objectsToDelete,
            Quiet: false,
          },
        })
      )

      logger.info(`Permanently deleted all versions of object.`, {
        storage: storage.name,
      })

      return deleted
    } else {
      logger.info(`No objects to delete.`, { storage: storage.name })

      return []
    }
  } catch (error) {
    if (retry >= 3) {
      throw error
    }

    return deleteObjects(client, storage, objects, retry + 1)
  }
}
