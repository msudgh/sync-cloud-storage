declare namespace NodeJS {
  interface ProcessEnv {
    AWS_ACCESS_KEY_ID?: string
    AWS_SECRET_ACCESS_KEY?: string
    AWS_REGION?: string
    AWS_ENDPOINT_URL?: string
    IS_OFFLINE?: string
    LOAD_AWS_CREDENTIALS?: string
  }
}
