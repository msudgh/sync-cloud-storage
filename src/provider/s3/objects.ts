import fs from 'fs'

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
  _Object,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { lookup } from 'mrmime'

import { handleBucketError } from '../../errors'
import { Bucket, LocalFile } from '../../types'
import { getChecksum } from '../../utils/objects'

export const listObjects = async (
  client: S3Client,
  bucket: Bucket
): Promise<_Object[]> => {
  console.log('List objects from bucket', {
    bucketName: bucket.bucketName,
  })

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket.bucketName,
    })

    const { Contents } = await client.send(command)

    return Contents ?? []
  } catch (error) {
    throw handleBucketError(error as Error, bucket)
  }
}

export const uploadObjects = async (
  client: S3Client,
  bucket: Bucket,
  localFiles: LocalFile[],
  filesToUpload: string[]
): Promise<_Object[]> => {
  const uploadedObjects: _Object[] = []

  for (const checksum of filesToUpload) {
    const fileToUpload = localFiles.find(
      (file) => getChecksum(file.Key, file.ETag) === checksum
    )

    if (!fileToUpload) {
      continue
    }

    console.log('Upload file to bucket', {
      bucketName: bucket.bucketName,
      Key: fileToUpload.Key,
      checksum,
    })

    try {
      const command = new Upload({
        client,
        params: {
          Bucket: bucket.bucketName,
          Key: fileToUpload.Key,
          Body: fs.createReadStream(fileToUpload.LocalPath),
          ACL: bucket.acl,
          ContentType: lookup(fileToUpload.LocalPath) ?? undefined,
        },
        tags: getTags(bucket.bucketTags),
      })

      console.log('Uploaded file to bucket', {
        bucketName: bucket.bucketName,
        Key: fileToUpload.Key,
        command,
      })

      await command.done()
      uploadedObjects.push(fileToUpload)
    } catch (error) {
      throw handleBucketError(error as Error, bucket)
    }
  }

  return uploadedObjects
}

export const deleteObjects = async (
  client: S3Client,
  bucket: Bucket,
  objects: _Object[]
): Promise<_Object[]> => {
  const keys = objects.map((object) => object.Key)
  console.log('Delete following object from bucket', {
    bucketName: bucket.bucketName,
    keys,
  })

  try {
    const command = new DeleteObjectsCommand({
      Bucket: bucket.bucketName,
      Delete: {
        Objects: objects.map((object) => ({
          Key: object.Key,
          VersionId: object.ETag,
        })),
      },
    })

    await client.send(command)

    console.log('Deleted following object from bucket', {
      bucketName: bucket.bucketName,
      keys,
    })

    return objects
  } catch (error) {
    throw handleBucketError(error as Error, bucket)
  }
}

export const getTags = (
  tags: Record<string, string>
): { Key: string; Value: string }[] => {
  return Object.keys(tags).map((Key) => ({ Key, Value: tags[Key] }))
}
