export const getChecksum = (key = '', etag = '') => {
  return `${key}-${etag}`
}
