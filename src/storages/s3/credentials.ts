import { Credentials } from 'serverless/plugins/aws/provider/awsProvider'

import { ExtendedServerlessProvider } from '../../types'

/**
 * Gets the credentials for the S3 client.
 * @memberof S3
 * @param {ExtendedServerlessProvider} provider
 * @returns {Credentials}
 * @example
 * const credentials = getCredentials(provider)
 * const client = new S3Client(credentials)
 */
export const getCredentials = (
  provider: ExtendedServerlessProvider
): Credentials => {
  const { cachedCredentials, getRegion, getCredentials } = provider
  const credentials = cachedCredentials ?? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? undefined,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? undefined,
  }
  const { accessKeyId, secretAccessKey } = credentials
  const region = getRegion()

  if (accessKeyId && secretAccessKey) {
    return {
      region,
      credentials,
    }
  }

  if (getCredentials() !== undefined) {
    return {
      region: getCredentials().region || region,
      credentials: getCredentials().credentials,
    }
  } else {
    throw new Error('AWS credentials not found!')
  }
}
