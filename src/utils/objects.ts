import path from 'path'

import { lookup } from 'mrmime'

/**
 * Get a checksum for an object
 * @memberof Utils
 * @param {string} key
 * @param {string} etag
 * @returns {string}
 */
export const getChecksum = (key: string = '', etag: string = ''): string => {
  return `${key}-${etag.replace(/"/g, '')}`
}

/**
 * Returns the MIME type of a file based on its extension.
 * If the file extension is not recognized, it returns a default MIME type.
 *
 * @param {string} [key] - The name of the file including its extension.
 * @returns {string} The MIME type of the file.
 */
export const getContentType = (key?: string): string => {
  const defaultMimeType = 'application/octet-stream'
  return key ? lookup(key) ?? defaultMimeType : defaultMimeType
}

export const extractAfterSubdirectory = (
  fullPath: string,
  subdirectory: string
) => {
  // Normalize both paths to ensure consistent separators
  const normalizedFullPath = path.normalize(fullPath)
  const normalizedLocalPath = path.normalize(subdirectory)

  // Find the start index of the subdirectory in the full path
  const startIndex = normalizedFullPath.indexOf(normalizedLocalPath)

  // Assuming subdirectory is always part of fullPath, calculate the end index
  const endIndex = startIndex + normalizedLocalPath.length

  // Extract the part of the full path after the subdirectory
  // Check if endIndex is at the path's end or adjust for separator
  const afterSubdirectory =
    endIndex >= normalizedFullPath.length
      ? ''
      : normalizedFullPath.substring(endIndex + 1)

  // Return the extracted path part, ensuring no leading separators
  return afterSubdirectory ? path.normalize(afterSubdirectory) : ''
}
