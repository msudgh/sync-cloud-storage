import {
  createInvalidInputFixture,
  createValidInputFileFixture,
} from './input.fixture'
import { custom } from '../../src/schemas/input'

describe('Input Custom Schema', () => {
  it('should validate the generated fake data', () => {
    const input = createValidInputFileFixture()
    const result = custom.safeParse(input)

    expect(result.success).toBe(true)
  })

  it('should throw an error if the data is invalid', () => {
    const invalidInput = createInvalidInputFixture()
    const result = custom.safeParse(invalidInput)

    expect(result.success).toBe(false)
  })
})
