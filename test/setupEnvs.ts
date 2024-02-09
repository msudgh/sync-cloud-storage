import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader'

export const setupEnvs = async (): Promise<void> => {
  const { credentialsFile, configFile } = await loadSharedConfigFiles({
    ignoreCache: true,
  })

  const profile = process.env.AWS_PROFILE ?? 'default'
  const credentials = credentialsFile[profile]
  const config = configFile[profile]

  if (credentials && config) {
    const { aws_access_key_id, aws_secret_access_key, aws_session_token } =
      credentials
    const { region } = config

    if (
      aws_access_key_id &&
      aws_secret_access_key &&
      aws_session_token &&
      region
    ) {
      process.env.AWS_ACCESS_KEY_ID = aws_access_key_id
      process.env.AWS_SECRET_ACCESS_KEY = aws_secret_access_key
      process.env.AWS_SESSION_TOKEN = aws_session_token
      process.env.AWS_REGION = region
    }
  }
}
