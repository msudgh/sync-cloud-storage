import { createHash } from 'crypto'
import * as fs from 'fs'
import path from 'path'

import { Storage } from '../../schemas/input'
import { LocalFile } from '../../types'

/**
 * Returns a list of local files recursively.
 * @memberof Local
 * @param {string} folder
 * @param {Storage} storage
 * @returns {Promise<LocalFile[]>}
 */
export const getLocalFiles = async (
  folder: string,
  storage: Storage
): Promise<LocalFile[]> => {
  const recursiveFiles = []
  const files = await fs.promises.readdir(folder)

  for (const item of files) {
    const fullPath = path.join(folder, item)
    const stat = await fs.promises.stat(fullPath)

    if (stat.isDirectory()) {
      const innerFiles = await getLocalFiles(fullPath, storage)
      recursiveFiles.push(...innerFiles)
    } else {
      const file: LocalFile = {
        LocalPath: fullPath,
        Key: storage.prefix ? path.join(`${storage.prefix}/${item}`) : item,
        LastModified: new Date(stat.mtime),
        Size: stat.size,
        ETag: await getFileETag(fs.createReadStream(fullPath)),
      }

      recursiveFiles.push(file)
    }
  }

  return recursiveFiles
}

const getFileETag = async (stream: fs.ReadStream) => {
  const hash = createHash('md5')
  for await (const chunk of stream) {
    hash.update(chunk)
  }
  return hash.digest('hex').toLowerCase()
}
