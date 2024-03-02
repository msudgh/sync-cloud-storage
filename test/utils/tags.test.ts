import { faker } from '@faker-js/faker'

import { mergeTags } from '../../src/utils/tags'

describe('tags', () => {
  it('should correctly merge new tags into existing tags and overwriting', () => {
    const tagAKey = faker.string.alpha(10)
    const tagAValue = faker.string.alpha(10)
    const tagAOverwriteValue = faker.string.alpha(10)
    const tagBKey = faker.string.alpha(10)
    const tagBValue = faker.string.alpha(10)
    const existingTags = [{ Key: tagAKey, Value: tagAValue }]
    const newTags = { [tagAKey]: tagAOverwriteValue, [tagBKey]: tagBValue }

    const expected = [
      { Key: tagAKey, Value: tagAOverwriteValue }, // Overwritten
      { Key: tagBKey, Value: tagBValue }, // Added
    ]

    const result = mergeTags(existingTags, newTags)
    expect(result).toEqual(expected)
  })
})
