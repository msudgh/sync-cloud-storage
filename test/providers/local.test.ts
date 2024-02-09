import path from 'path'

import { getLocalFiles } from '../../src/providers/local/objects'
import { createValidInputFixture } from '../schemas/input.fixture'

describe('Local File Provider', () => {
  it('should return files and directories', async () => {
    const localPath = path.resolve(
      __dirname,
      '..',
      'assets',
      'giraffe-multiple'
    )
    const {
      syncCloudStorage: {
        storages: [storage],
      },
    } = createValidInputFixture(localPath)
    const expectedFiles = ['sub/README.md', 'README.md']
    const numberOfFiles = expectedFiles.length
    const filesToUpload = await getLocalFiles(localPath, storage)
    const filesToUploadKeys = filesToUpload.map((file) => file.Key)

    for (const file of expectedFiles) {
      expect(filesToUploadKeys.includes(file)).toEqual(true)
    }

    expect(filesToUploadKeys).toHaveLength(numberOfFiles)
  })
})
