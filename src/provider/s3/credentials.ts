import { ExtendedServerlessProvider } from '../../types'

export const getCredentials = (provider: ExtendedServerlessProvider) => {
  if (
    provider.cachedCredentials &&
    typeof provider.cachedCredentials.accessKeyId != 'undefined' &&
    typeof provider.cachedCredentials.secretAccessKey != 'undefined' &&
    typeof provider.cachedCredentials.sessionToken != 'undefined'
  ) {
    return {
      region: provider.getRegion(),
      credentials: {
        accessKeyId: provider.cachedCredentials.accessKeyId,
        secretAccessKey: provider.cachedCredentials.secretAccessKey,
        sessionToken: provider.cachedCredentials.sessionToken,
      },
    }
  } else {
    return {
      region: provider.getRegion() || provider.getCredentials().region,
      credentials: provider.getCredentials().credentials,
    }
  }
}
