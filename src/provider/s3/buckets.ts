import {
  CopyObjectCommand,
  GetBucketTaggingCommand,
  MetadataDirective,
  PutBucketTaggingCommand,
  S3Client,
  Tag,
  _Object,
} from '@aws-sdk/client-s3'
import { lookup } from 'mrmime'

import { deleteObjects, listObjects, uploadObjects } from './objects'
import { handleBucketError } from '../../errors'
import { Bucket } from '../../types'
import { getChecksum } from '../../utils/objects'
import { getLocalFiles } from '../local/objects'

export const sync = async (client: S3Client, bucket: Bucket) => {
  const files = await getLocalFiles(bucket.localPath, bucket)
  const localFilesChecksum = files.map((file) =>
    getChecksum(file.Key, file.ETag)
  )

  const objects = await listObjects(client, bucket)

  const bucketObjectsChecksum = objects.map((object) =>
    getChecksum(object.Key, object.ETag)
  )

  const filesToUpload = localFilesChecksum.filter(
    (fileChecksum) => !bucketObjectsChecksum.includes(fileChecksum)
  )

  const filesToDelete = bucketObjectsChecksum.filter(
    (objectChecksum) => !localFilesChecksum.includes(objectChecksum)
  )

  let uploaded: _Object[] = []
  let deleted: _Object[] = []

  if (filesToUpload.length > 0 && bucket.actions.includes('upload')) {
    uploaded = await uploadObjects(client, bucket, files, filesToUpload)
  }

  if (filesToDelete.length > 0 && bucket.actions.includes('delete')) {
    if (bucket.deleteRemoved) {
      const objectsToDelete = objects.filter((object) =>
        filesToDelete.includes(getChecksum(object.Key, object.ETag))
      )

      deleted = await deleteObjects(client, bucket, objectsToDelete)
    }
  }

  console.log({
    bucket,
    files,
    objects,
    localFilesChecksum,
    bucketObjectsChecksum,
    filesToUpload,
    filesToDelete,
    uploaded,
    deleted,
  })

  return { uploaded: uploaded, deleted }
}

export const syncMetadata = async (
  client: S3Client,
  bucket: Bucket,
  syncedObjects: _Object[]
) => {
  console.log(`Syncing metadata for bucket: ${bucket.bucketName}`)

  try {
    for (const file of syncedObjects) {
      const detectedContentType =
        lookup(file.Key as string) ?? bucket.defaultContentType

      try {
        const copyCommand = new CopyObjectCommand({
          Bucket: bucket.bucketName,
          Key: file.Key,
          CopySource: encodeURIComponent(`${bucket.bucketName}/${file.Key}`),
          ContentType: detectedContentType,
          MetadataDirective: MetadataDirective.REPLACE,
          ACL: bucket.acl,
          Metadata: bucket.metadata,
        })

        await client.send(copyCommand)

        console.log('Metadata synced', {
          bucket: bucket.bucketName,
          Key: file.Key,
        })
      } catch (error) {
        console.error(`Error syncing metadata for file: ${file.Key}`, error)

        return false
      }
    }
  } catch (error) {
    throw handleBucketError(error as Error, bucket)
  }
}

export const syncTags = async (client: S3Client, bucket: Bucket) => {
  try {
    const existingTagSetCommand = new GetBucketTaggingCommand({
      Bucket: bucket.bucketName,
    })

    const existingTagSet = await client.send(existingTagSetCommand)
    existingTagSet.TagSet = existingTagSet.TagSet ?? []

    const newTagSet = mapTags(bucket.bucketTags)

    const command = new PutBucketTaggingCommand({
      Bucket: bucket.bucketName,
      Tagging: {
        TagSet: mergeTags(existingTagSet.TagSet, newTagSet),
      },
    })

    await client.send(command)

    return true
  } catch (error) {
    throw handleBucketError(error as Error, bucket)
  }
}

export const mapTags = (
  tags: Record<string, string>
): { Key: string; Value: string }[] => {
  return Object.keys(tags).map((Key) => ({ Key, Value: tags[Key] }))
}

const mergeTags = (
  existingTagSet: Array<Tag>,
  tagsToMerge: Array<Tag>
): Array<Tag> => {
  const mergedTagSet = [...existingTagSet]

  tagsToMerge.forEach((tag) => {
    const existingTag = mergedTagSet.find((et) => et.Key === tag.Key)
    if (existingTag) {
      existingTag.Value = tag.Value
    } else {
      mergedTagSet.push(tag)
    }
  })

  return mergedTagSet
}
