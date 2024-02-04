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
