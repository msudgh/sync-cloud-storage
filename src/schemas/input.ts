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
  name: z.string(),
  // Ref: https://github.com/mrmlnc/fast-glob#pattern-syntax
  patterns: z.array(z.string()).min(1),
  actions: z.array(z.string()).default(['upload', 'delete']),
  prefix: z.string().default(''),
  enabled: z.boolean().default(true),
  acl: z.enum(objectCannedACLs).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  tags: z.record(z.string(), z.string()).default({}),
  gitignore: z.boolean().default(false),
  ignoreFiles: z.array(z.string()).optional(),
})

const storages = z.array(storage).min(1)

const custom = z.object({
  syncCloudStorage: z.object({
    disabled: z.boolean().optional().default(false),
    storages: storages,
    endpoint: z.string().optional(),
    offline: z
      .boolean()
      .optional()
      .default(process.env.IS_OFFLINE === 'true'),
  }),
})

type Custom = z.infer<typeof custom>
type Storage = z.infer<typeof storage>
type Tags = z.infer<typeof tags>

export type { Custom, Storage, Tags }
export { custom, tags, storage, storages, objectCannedACLs }
