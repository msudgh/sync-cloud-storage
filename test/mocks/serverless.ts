import { Custom } from '../../src/schemas/input'
import { IServerless } from '../../src/types'

const serverlessGetProviderSpy = jest.fn().mockReturnValue({
  getRegion: () => process.env.AWS_REGION ?? '',
  cachedCredentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
})

export const getServerlessMock = (
  inputCustom: Custom,
  servicePath: string
): IServerless => ({
  service: {
    custom: inputCustom,
    serverless: { config: { servicePath } },
  },
  getProvider: serverlessGetProviderSpy,
})
