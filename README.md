# sync-cloud-storage

[![NPM](https://img.shields.io/npm/v/sync-cloud-storage)](https://www.npmjs.com/package/sync-cloud-storage)
[![Pipeline Status](https://github.com/msudgh/sync-cloud-storage/actions/workflows/ci.yml/badge.svg?branch=main)](./.github/workflows/ci.yml)
[![Codecov Status](https://codecov.io/gh/msudgh/sync-cloud-storage/branch/main/graph/badge.svg?token=2BY6063VOY)](https://codecov.io/gh/msudgh/sync-cloud-storage)
[![License](https://img.shields.io/github/license/msudgh/sync-cloud-storage)](LICENSE)

sync-cloud-storage is a Node.js package designed to seamlessly synchronize files and directories between local environments and cloud storage providers like [AWS S3](https://aws.amazon.com/s3/). It leverages [AWS SAM (Serverless)](https://www.serverless.com/) and [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/) for powerful, modern, and flexible integrations.

## Features

- Sync multiple storage at once
- Use pattern matching on finding files (single or multiple file/dir sync) by defining patterns of [`glob`](<https://en.wikipedia.org/wiki/Glob_(programming)>) to include or exclude
- Supports a set of options as following for each file based on storage features: `Prefix`, `Access Control List (ACL)`, `Tags`, `Metadata`
- Modern and uses the latest official cloud provider's SDK
  - AWS S3: [`aws-sdk@3.x`](https://www.npmjs.com/package/@aws-sdk/client-s3)

## Installation

- [**npm**](https://npmjs.com/): `npm i sync-cloud-storage`
- [**yarn**](https://yarnpkg.com/): `yarn add sync-cloud-storage`
- [**pnpm**](https://pnpm.io/): `pnpm add sync-cloud-storage`
- [**ni**](https://github.com/antfu/ni): `ni sync-cloud-storage`

## Usage

### AWS S3

#### Serverless

The integration is powered by Serverless hooks to sync storages, tags, and metadata.
In below, the default configured hooks are listed:

- scs:storages -> As a CLI command for serverless
- scs:tags -> As a CLI command for serverless
- scs:metadata -> As a CLI command for serverless
- before:offline:start:init -> Sync storages (scs:storages)
- before:deploy:deploy -> Sync storages (scs:storages)

##### Example

This setup uses `before:deploy:deploy` hook to sync storages before deploying the stack:

```yaml
plugins:
  - sync-cloud-storage

custom:
  syncCloudStorage:
    - name: my-bucket
      patterns:
        - assets/*
      actions:
        - upload
        - delete
      prefix: assets
      acl: public-read
      metadata:
        foo: bar
        bar: foo
      tags:
        foo: bar
        bar: foo
```

#### CDK

Call sync storages action after setting up a CDK App:

```typescript
import { Stack, App } from '@aws-cdk/core'
import SyncCloudStorage from 'sync-cloud-storage'

const app = new App()
const stack = new Stack(app, 'MyStack')
const syncCloudStorage = new SyncCloudStorage(stack, {
  storages: [
    {
      name: 'my-bucket',
      patterns: ['assets/*'],
      actions: ['upload', 'delete'],
      prefix: 'assets',
      acl: 'public-read',
      metadata: {
        foo: 'bar',
        bar: 'foo',
      },
    },
  ],
})

// Sync storages
syncCloudStorage.storages()
// Sync tags
syncCloudStorage.tags()
// Sync metadata
syncCloudStorage.metadata()
```

## Options

### General

| Option   | Notes                              | Type                             | Required | Default                                              |
| -------- | ---------------------------------- | -------------------------------- | -------- | ---------------------------------------------------- |
| storages | List of storages, Minimum items: 1 | `array` of [`storage`](#storage) | true     | undefined                                            |
| region   | Cloud (AWS) region                 | `string`                         | false    | undefined or `AWS_REGION` environment variable       |
| endpoint | Cloud (AWS) Endpoint URL           | `string`                         | false    | undefined or `AWS_ENDPOINT_URL` environment variable |
| offline  | Offline mode                       | `boolean`                        | false    | false or `IS_OFFLINE` environment variable           |
| disabled | Disable sync                       | `boolean`                        | false    | false                                                |
| silent   | Silent output logs                 | `boolean`                        | false    | false                                                |

### Storage

| Option      | Notes                                                                                                       | Type                | Required | Default                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| name        | Name of storage (AWS S3 Bucket), Minimum length: 1                                                          | `string`            | true     | undefined                                                                                                                      |
| patterns    | Patterns of [`glob`][glob] paths to include or exclude on sync action, Minimum items: 1                     | `array` of `string` | true     | undefined                                                                                                                      |
| actions     | Sync actions, Valid values: `upload`, `delete`                                                              | `array` of `string` | false    | `upload`: Only upload new or modified file, `delete`: Only delete files that are not in the local environment from the storage |
| prefix      | Prefix for the storage files and folders                                                                    | `string`            | false    | `''`                                                                                                                           |
| enabled     | Enable or disable the storage on sync action                                                                | `boolean`           | false    | `true`                                                                                                                         |
| acl         | [AWS S3 Canned ACL][acl], Valid values: `private`, `public-read`, `public-read-write`, `authenticated-read` | `string`            | false    | undefined                                                                                                                      |
| metadata    | A set of metadata key/value pair to be set or unset on the object                                           | `object`            | false    | undefined                                                                                                                      |
| tags        | A set of tag key/value pair to be set or unset on the object                                                | `object`            | false    | undefined                                                                                                                      |
| gitignore   | Use .gitignore file to exclude files and directories                                                        | `boolean`           | false    | false                                                                                                                          |
| ignoreFiles | Ignore files and directories to exclude from sync action                                                    | `array` of `string` | false    | undefined                                                                                                                      |

[glob]: https://en.wikipedia.org/wiki/Glob_(programming)
[acl]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/acl-overview.html#canned-acl
