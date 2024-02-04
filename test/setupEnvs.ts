import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader'

const DEFAULT_PROFILE = 'default'
const AWS_REGION = 'AWS_REGION'
const AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID'
const AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY'
const AWS_SESSION_TOKEN = 'AWS_SESSION_TOKEN'

const checkEnvVariables = (env: NodeJS.ProcessEnv) => {
  return (
    env[AWS_REGION] &&
    env[AWS_ACCESS_KEY_ID] &&
    env[AWS_SECRET_ACCESS_KEY] &&
    env[AWS_SESSION_TOKEN]
  )
}

export const setupEnvs = async (): Promise<void> => {
  const { credentialsFile, configFile } = await loadSharedConfigFiles({
    ignoreCache: true,
  })

  const profile = process.env.AWS_PROFILE ?? DEFAULT_PROFILE
  const credentials = credentialsFile[profile]
  const config = configFile[profile]

  if (!credentials && !config && checkEnvVariables(process.env)) {
    console.log(
      "AWS Region & Credentials not found in '~/.aws/credentials & '~/.aws/config'!"
    )
    console.log('Loaded AWS Region & Credentials from environment variables!')
    return
  }

  console.log('Loaded AWS Region & Credentials from AWS config files!')

  const { aws_access_key_id, aws_secret_access_key, aws_session_token } =
    credentials
  const { region } = config

  if (
    aws_access_key_id &&
    aws_secret_access_key &&
    aws_session_token &&
    region
  ) {
    process.env[AWS_ACCESS_KEY_ID] = aws_access_key_id
    process.env[AWS_SECRET_ACCESS_KEY] = aws_secret_access_key
    process.env[AWS_SESSION_TOKEN] = aws_session_token
    process.env[AWS_REGION] = region
  }
}
