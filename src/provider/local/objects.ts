import { createHash } from 'crypto'
import * as fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

import { Bucket, LocalFile } from '../../types'

export const getLocalFiles = async (
  folder: string,
  bucket: Bucket
): Promise<LocalFile[]> => {
  const recursiveFiles = []
  const files = await fs.promises.readdir(folder)

  for (const item of files) {
    const fullPath = path.join(folder, item)
    const stat = await fs.promises.stat(fullPath)

    if (stat.isDirectory()) {
      const innerFiles = await getLocalFiles(fullPath, bucket)
      recursiveFiles.push(...innerFiles)
    } else {
      const file: LocalFile = {
        LocalPath: fullPath,
        Key: bucket.bucketPrefix
          ? `${bucket.bucketPrefix}/${fullPath}`
          : fullPath,
        LastModified: stat.mtime,
        Size: stat.size,
        ETag: await getFileETag(fs.createReadStream(fullPath)),
      }

      recursiveFiles.push(file)
    }
  }

  return recursiveFiles
}

const calculateMD5 = async (stream: Readable): Promise<string> => {
  const hash = createHash('md5')

  for await (const chunk of stream) {
    hash.update(chunk)
  }

  return hash.digest('hex')
}

const getFileETag = async (stream: fs.ReadStream): Promise<string> => {
  const md5 = await calculateMD5(stream)
  return md5.toLowerCase()
}
