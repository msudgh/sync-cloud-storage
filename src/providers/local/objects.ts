import { createHash } from 'crypto'
import * as fs from 'fs'
import path from 'path'

import { GlobEntry, globby } from 'globby'

import { Storage } from '../../schemas/input'
import { LocalFile } from '../../types'
import { extractAfterSubdirectory } from '../../utils/objects'

const getKeyWithPrefix = (prefix: string, internalPath: string) =>
  prefix && prefix.length > 0 ? path.join(prefix, internalPath) : internalPath

export const getKey = (
  storage: Storage,
  localPathWithCwd: string,
  cwd: string
) => {
  const internalPath = extractAfterSubdirectory(localPathWithCwd, cwd)

  const keyWithPrefix = getKeyWithPrefix(storage.prefix, internalPath)

  return keyWithPrefix
}

const processFile = async (
  cwd: string,
  entry: GlobEntry,
  storage: Storage
): Promise<LocalFile> => {
  if (!entry.stats) {
    throw new Error(`No stats for ${entry.path}`)
  }

  const localPathWithCwd = path.join(cwd, entry.path)
  const etag =
    (await getFileETag(fs.createReadStream(localPathWithCwd))) ?? undefined
  const key = getKey(storage, localPathWithCwd, cwd)
  const lastModified = entry.stats.mtime ?? new Date()
  const size = entry.stats.size ?? 0

  return {
    fileName: entry.name,
    localPath: localPathWithCwd,
    key,
    lastModified,
    size,
    etag,
  }
}

/**
 * Returns a list of local files and directories by Globby!
 * @memberof Local
 * @param {string[]} patterns
 * @param {Storage} storage
 * @param {string} cwd - Current working directory
 * @returns {Promise<LocalFile[]>}
 */
export const getLocalFiles = async (
  patterns: string[],
  storage: Storage,
  cwd: string
): Promise<LocalFile[]> => {
  const globbyOptions = {
    expandDirectories: true,
    stats: true,
    onlyFiles: true,
    gitignore: storage.gitignore,
    ignoreFiles: storage.ignoreFiles,
    cwd,
  }
  const matchedFilesAndDirectories = (await globby(
    patterns,
    globbyOptions
  )) as unknown as GlobEntry[]

  const filePromises = matchedFilesAndDirectories.map((entry) =>
    processFile(cwd, entry, storage)
  )
  const results = await Promise.allSettled(filePromises)
  const files = results.reduce((acc: LocalFile[], result) => {
    if (result.status === 'fulfilled' && result.value) {
      acc.push(result.value)
    }
    return acc
  }, [])

  return files
}

const getFileETag = async (stream: fs.ReadStream) => {
  const hash = createHash('md5')
  for await (const chunk of stream) {
    hash.update(chunk)
  }
  return hash.digest('hex').toLowerCase()
}
