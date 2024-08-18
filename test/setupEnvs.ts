import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader'

import { logger } from '../src/utils/logger'

const defaultProfile = 'default'

const checkEnvVariables = (env: NodeJS.ProcessEnv) => {
  return env.AWS_REGION && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
}

export const setupEnvs = async (): Promise<void> => {
  const { credentialsFile, configFile } = await loadSharedConfigFiles({
    ignoreCache: true,
  })

  const profile = process.env.AWS_PROFILE ?? defaultProfile
  const credentials = credentialsFile[profile]
  const config = configFile[profile]

  if (!credentials || checkEnvVariables(process.env)) {
    logger.info(
      "AWS Region & Credentials not found in '~/.aws/credentials & '~/.aws/config'!"
    )
    logger.info('Loaded AWS Region & Credentials from environment variables!')
    return
  }

  logger.info('Loaded AWS Region & Credentials from AWS config files!')

  const {
    aws_access_key_id: awsAccessKeyID,
    aws_secret_access_key: awsSecretAccessKey,
  } = credentials
  const { region } = config

  if (region && awsAccessKeyID && awsSecretAccessKey) {
    process.env.AWS_REGION = region
    process.env.AWS_ACCESS_KEY_ID = awsAccessKeyID
    process.env.AWS_SECRET_ACCESS_KEY = awsSecretAccessKey
  }
}
