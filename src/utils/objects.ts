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
