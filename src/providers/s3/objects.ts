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
import { lookup } from 'mrmime'

import { handleMethodError } from '../../errors'
import { Storage } from '../../schemas/input'
import { LocalFile } from '../../types'
import { getChecksum } from '../../utils/objects'

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
  console.log('List objects in bucket', {
    name: storage.name,
  })

  try {
    const command = new ListObjectsV2Command({
      Bucket: storage.name,
    })

    const { Contents = [] } = await client.send(command)

    console.log('Storage objects', {
      name: storage.name,
      objects: Contents,
    })

    return Contents
  } catch (error) {
    throw handleMethodError(error as Error, storage)
  }
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

    console.log('Upload file to bucket', {
      name: storage.name,
      Key: fileToUpload.Key,
      checksum,
    })

    try {
      const command = new Upload({
        client,
        params: {
          Bucket: storage.name,
          Key: fileToUpload.Key,
          Body: fs.createReadStream(fileToUpload.LocalPath),
          ContentType: lookup(fileToUpload.LocalPath) ?? undefined,
        },
      })

      console.log('Uploaded file to bucket', {
        name: storage.name,
        Key: fileToUpload.Key,
        command,
      })

      const result = await command.done()

      uploadedObjects.push({
        Key: result.Key,
        ETag: result.ETag,
        VersionId: result.VersionId,
        Bucket: result.Bucket,
        Location: result.Location,
      })
    } catch (error) {
      handleMethodError(error as Error, storage)
    }
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
  objects: _Object[]
): Promise<DeletedObject[]> => {
  const keys = [...objects].map((object) => object.Key as string)
  console.log('Delete following objects from bucket', {
    bucket: storage.name,
    keys,
  })
  try {
    const listVersionsParams = {
      Bucket: storage.name,
    }

    const versions = await client.send(
      new ListObjectVersionsCommand(listVersionsParams)
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
      const deleteParams = {
        Bucket: storage.name,
        Delete: {
          Objects: objectsToDelete,
          Quiet: false,
        },
      }

      const { Deleted = [] } = await client.send(
        new DeleteObjectsCommand(deleteParams)
      )
      console.log(`Permanently deleted all versions of object.`)

      return Deleted
    } else {
      console.log(`No objects to delete.`)

      return []
    }
  } catch (error) {
    handleMethodError(error as Error, storage)
    return []
  }
}
