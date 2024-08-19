import { ObjectCannedACL } from '@aws-sdk/client-s3'
import type { ObjectCannedACL as ObjectCannedACLType } from '@aws-sdk/client-s3'
import { z } from 'zod'

type ObjectCannedACLsTuple = [ObjectCannedACLType, ...ObjectCannedACLType[]]

// Cast to ObjectCannedACLsTuple
const objectCannedACLs = Object.values(ObjectCannedACL).map(
  (acl) => acl
) as ObjectCannedACLsTuple

const tags = z.record(z.string(), z.string())

const storage = z.object({
  name: z.string().min(1).describe('Storage name'),
  patterns: z
    .array(z.string())
    .min(1)
    .describe('Patterns of glob paths to include or exclude on sync action'),
  actions: z
    .array(z.enum(['upload', 'delete']))
    .default(['upload', 'delete'])
    .describe('Sync actions'),
  prefix: z
    .string()
    .default('')
    .describe('Prefix for the storage files and folders'),
  enabled: z
    .boolean()
    .default(true)
    .describe('Enable or disable the storage on sync action'),
  acl: z.enum(objectCannedACLs).optional().describe('Access control list'),
  metadata: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'A set of metadata key/value pair to be set or unset on the object'
    ),
  tags: z
    .record(z.string(), z.string())
    .optional()
    .describe('A set of tag key/value pair to be set or unset on the object'),
  gitignore: z
    .boolean()
    .default(false)
    .describe('Use .gitignore file to exclude files and directories'),
  ignoreFiles: z
    .array(z.string())
    .optional()
    .describe('Ignore files and directories to exclude from sync action'),
})

const storages = z.array(storage).min(1).describe('List of storages')

const customOptions = z.object({
  syncCloudStorage: z.object({
    disabled: z.boolean().optional().default(false).describe('Disable sync'),
    storages: storages,
    endpoint: z
      .string()
      .optional()
      .default(process.env.AWS_ENDPOINT_URL ?? '')
      .describe('Cloud (AWS) Endpoint URL'),
    offline: z
      .boolean()
      .optional()
      .default(process.env.IS_OFFLINE === 'true')
      .describe('Offline mode'),
    region: z.string().optional().describe('Cloud (AWS) region'),
    silent: z.boolean().optional().describe('Silent output logs'),
  }),
})

type CustomOptions = z.infer<typeof customOptions>
type Storage = z.infer<typeof storage>
type Tags = z.infer<typeof tags>

export type { CustomOptions, Storage, Tags }
export { customOptions, tags, storage, storages, objectCannedACLs }
