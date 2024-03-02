import { getLocalFiles } from '../../src/providers/local/objects'
import { createValidInputFixture } from '../schemas/input.fixture'

describe('Local File Provider', () => {
  it('should return files', async () => {
    const patterns = ['test/assets/giraffe-multiple']
    const {
      syncCloudStorage: {
        storages: [storage],
      },
    } = createValidInputFixture(patterns)
    const expectedFiles = [
      'test/assets/giraffe-multiple/README.md',
      'test/assets/giraffe-multiple/sub/README.md',
    ]
    const filesToUpload = await getLocalFiles(patterns, storage, process.cwd())
    const filesToUploadKeys = filesToUpload.map((file) => file.key)

    expect.assertions(1)
    expect(expectedFiles).toStrictEqual(filesToUploadKeys)
  })

  it('should return files that are not ignored', async () => {
    const patterns = [
      'test/assets/giraffe-multiple',
      '!test/assets/giraffe-multiple/README.md',
    ]
    const {
      syncCloudStorage: {
        storages: [storage],
      },
    } = createValidInputFixture(patterns)
    const expectedFiles = ['test/assets/giraffe-multiple/sub/README.md']
    const filesToUpload = await getLocalFiles(patterns, storage, process.cwd())
    const filesToUploadKeys = filesToUpload.map((file) => file.key)

    expect.assertions(1)
    expect(expectedFiles).toStrictEqual(filesToUploadKeys)
  })
})
