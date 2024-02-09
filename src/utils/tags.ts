import { Tag } from '@aws-sdk/client-s3'

import { Tags } from '../schemas/input'

/**
 * Merges two tag sets.
 * @memberof Utils
 * @param {Tag[] | undefined} existingTags
 * @param {Tags} newTags
 * @returns {Tag[]}
 */
export const mergeTags = (
  existingTags: Tag[] | undefined,
  newTags: Tags
): Tag[] => {
  const newTagSet = Object.keys(newTags).map((key) => ({
    Key: key,
    Value: newTags[key],
  }))

  const mergedTagSet = [...(existingTags ?? [])]

  newTagSet.forEach((newTag) => {
    const existingTagIndex = mergedTagSet.findIndex(
      (tag) => tag.Key === newTag.Key
    )
    if (existingTagIndex > -1) {
      mergedTagSet[existingTagIndex].Value = newTag.Value
    } else {
      mergedTagSet.push(newTag)
    }
  })

  return mergedTagSet
}
