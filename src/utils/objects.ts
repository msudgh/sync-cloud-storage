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
  const normalizedSubdirectory = path.normalize(subdirectory)

  // Find the start index of the subdirectory in the full path
  const startIndex = normalizedFullPath.indexOf(normalizedSubdirectory)

  if (startIndex !== -1) {
    // Calculate the end index of the subdirectory within the full path
    const endIndex = startIndex + normalizedSubdirectory.length + 1

    // Extract the part of the full path after the subdirectory
    const afterSubdirectory = normalizedFullPath.substring(endIndex)

    // Normalize the extracted path to clean up any leading separators
    return path.normalize(afterSubdirectory)
  } else {
    return '' // Subdirectory not found in the full path
  }
}
