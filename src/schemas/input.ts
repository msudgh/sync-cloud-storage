import { ObjectCannedACL } from '@aws-sdk/client-s3'
import type { ObjectCannedACL as ObjectCannedACLType } from '@aws-sdk/client-s3'
import { z } from 'zod'

// Cast to tuple type
type TupleType = [ObjectCannedACLType, ...ObjectCannedACLType[]]
export const ObjectCannedACLs = [
  ...Object.values(ObjectCannedACL).map((acl) => acl),
] as TupleType

const tags = z.record(z.string(), z.string())

const storage = z.object({
  name: z.string(),
  localPath: z.string(),
  actions: z.array(z.string()).default(['upload', 'delete']),
  bucketPrefix: z.string().default(''),
  enabled: z.boolean().default(true),
  acl: z.enum(ObjectCannedACLs).default(ObjectCannedACL.authenticated_read),
  defaultContentType: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  tags: z.record(z.string(), z.string()).default({}),
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
export { custom, tags, storage, storages }
