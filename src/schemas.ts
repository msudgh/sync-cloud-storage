import { ObjectCannedACL } from '@aws-sdk/client-s3'
import type { ObjectCannedACL as ObjectCannedACLType } from '@aws-sdk/client-s3'
import { z } from 'zod'

// Cast to tuple type
type TupleType = [ObjectCannedACLType, ...ObjectCannedACLType[]]
const ACLs = [...Object.values(ObjectCannedACL).map((acl) => acl)] as TupleType

const bucketSchema = z.object({
  bucketName: z.string(),
  localPath: z.string(),
  actions: z.array(z.string()).default(['upload', 'delete']),
  bucketPrefix: z.string().default(''),
  enabled: z.boolean().default(true),
  deleteRemoved: z.boolean().default(true),
  acl: z.enum(ACLs).default(ObjectCannedACL.authenticated_read),
  defaultContentType: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  bucketTags: z.record(z.string(), z.string()).default({}),
})

const bucketsSchema = z.array(bucketSchema)

const inputCustomSchema = z.object({
  cloudBucketSync: z.object({
    disabled: z.boolean().optional().default(false),
    buckets: bucketsSchema,
    endpoint: z.string().optional(),
    offline: z.boolean().optional().default(false),
  }),
})

export type InputCustomSchema = z.infer<typeof inputCustomSchema>
export { inputCustomSchema }
