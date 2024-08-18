# sync-cloud-storage

[![NPM](https://img.shields.io/npm/v/sync-cloud-storage)](https://www.npmjs.com/package/sync-cloud-storage)
[![Pipeline Status](https://github.com/msudgh/sync-cloud-storage/actions/workflows/ci.yml/badge.svg?branch=main)](./.github/workflows/ci.yml)
[![Codecov Status](https://codecov.io/gh/msudgh/sync-cloud-storage/branch/main/graph/badge.svg?token=2BY6063VOY)](https://codecov.io/gh/msudgh/sync-cloud-storage)
[![License](https://img.shields.io/github/license/msudgh/sync-cloud-storage)](LICENSE)

Synchronize files and directories between a remote computer and a cloud storage through cloud formation.

Supported cloud formation providers:

- [x] Serverless
- [x] CDK

Supported cloud storages:

- [x] AWS S3

## Features

- Modern and uses the latest official cloud provider's SDK
  - AWS S3: [`aws-sdk@3.x`](https://www.npmjs.com/package/@aws-sdk/client-s3)
- Sync multiple storages at once and flexible file matching (single or multiple file/dir sync) by just defining patterns of [`glob`](<https://en.wikipedia.org/wiki/Glob_(programming)>) to include or exclude
- Set the following configs for each synced file:
  - prefix
  - access control list (ACL)
  - tags
  - metadata
- Select a list of specific sync actions for each storage:
  - upload
  - delete
- Written in **TypeScript** with strong type checking
- Integration test with cloud providers

## Installation

1. [**ni**](https://github.com/antfu/ni): `ni sync-cloud-storage -D`
2. [**npm**](https://npmjs.com/): `npm i sync-cloud-storage -D`
3. [**yarn**](https://yarnpkg.com/): `yarn add sync-cloud-storage -D`
4. [**pnpm**](https://pnpm.io/): `pnpm add sync-cloud-storage -D`

## Usage

### Serverless

#### AWS S3

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
```

### CDK

#### AWS S3

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
```

## Configuration Reference

This section provides a detailed reference for all configuration options.

- `name`:

  - Type: `string`
  - Required: `true`
  - Minimum length: 1
  - Example: `name: assets`

- `patterns`: File patterns to include or exclude during synchronization.

  - Type: `array` of `string`
  - Required: `true`
  - Minimum items: 1
  - Example:
    ```yaml
    patterns:
      - 'assets/*'
      - '!assets/temp/*'
    ```

- `actions`: List of actions to perform during synchronization.

  - Type: `array` of `string`
  - Required: `true`
  - Valid Values: `upload`, `delete`
  - Example:
    ```yaml
    actions:
      - upload
      - delete
    ```

- `prefix`: The prefix to apply to all synced files in the bucket.

  - Type: `string`
  - Required: `false`
  - Default: `""`
  - Example: `prefix: assets`

- `enabled`: Whether to enable the sync for the storage.

  - Type: `boolean`
  - Required: `false`
  - Default: `true`

- `acl`: Access control list setting for the synced files.

  - Type: `string`
  - Required: `false`
  - Valid Values: `private`, `public-read`, `public-read-write`, `authenticated-read`
  - Reference: [AWS S3 Canned ACL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/acl-overview.html#canned-acl)
  - Example: `acl: public-read`

- `metadata`: Custom metadata to apply to the synced files.

  - Type: `object`
  - Required: `false`
  - Example:
    ```yaml
    metadata:
      foo: bar
      bar: foo
    ```

- `tags`: Custom tags to apply to the synced files.
  - Type: `object`
  - Required: `false`
  - Default: `{}`
  - Example:
    ```yaml
    tags:
      environment: production
    ```
