import { getContentType } from '../../src/utils/objects'

describe('objects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the correct MIME type when a key is provided and found', () => {
    const result = getContentType('file.jpg')
    expect(result).toBe('image/jpeg')
  })

  it('returns default MIME type when a key is provided but not found', () => {
    const result = getContentType('unknown.extension')
    expect(result).toBe('application/octet-stream')
  })

  it('returns default MIME type when no key is provided', () => {
    const result = getContentType()
    expect(result).toBe('application/octet-stream')
  })
})
