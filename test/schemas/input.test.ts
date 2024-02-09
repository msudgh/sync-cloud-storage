import {
  createInvalidInputFixture,
  createValidInputDirectoryFixture,
  createValidInputFileFixture,
} from './input.fixture'
import { custom } from '../../src/schemas/input'

describe('Input Custom Schema', () => {
  it('should validate the generated fake data', () => {
    const fileInput = createValidInputFileFixture()
    const result1 = custom.safeParse(fileInput)

    expect(result1.success).toBe(true)

    const directoryInput = createValidInputDirectoryFixture()
    const result2 = custom.safeParse(directoryInput)

    expect(result2.success).toBe(true)
  })

  it('should throw an error if the data is invalid', () => {
    const fakeData = createInvalidInputFixture()
    const result = custom.safeParse(fakeData)

    expect(result.success).toBe(false)
  })
})
