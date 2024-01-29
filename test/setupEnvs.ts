import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader'

export const setupEnvs = async (): Promise<void> => {
  const iniFiles = await loadSharedConfigFiles({
    ignoreCache: true,
  })

  const isCI = process.env.CI === 'true'
  const awsENVsExist =
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_SESSION_TOKEN

  if (!isCI || awsENVsExist) {
    process.env.AWS_ACCESS_KEY_ID =
      iniFiles.credentialsFile[
        process.env.AWS_PROFILE ?? 'default'
      ].aws_access_key_id
    process.env.AWS_SECRET_ACCESS_KEY =
      iniFiles.credentialsFile[
        process.env.AWS_PROFILE ?? 'default'
      ].aws_secret_access_key
    process.env.AWS_SESSION_TOKEN =
      iniFiles.credentialsFile[
        process.env.AWS_PROFILE ?? 'default'
      ].aws_session_token
    process.env.AWS_REGION =
      iniFiles.configFile[process.env.AWS_PROFILE ?? 'default'].region
  }
}
