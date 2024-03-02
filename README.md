# sync-cloud-storage

[![NPM](https://img.shields.io/npm/v/sync-cloud-storage)](https://www.npmjs.com/package/sync-cloud-storage)
[![Pipeline Status](https://github.com/msudgh/sync-cloud-storage/actions/workflows/ci.yml/badge.svg?branch=main)](./.github/workflows/ci.yml)
[![Codecov Status](https://codecov.io/gh/msudgh/sync-cloud-storage/branch/main/graph/badge.svg?token=2BY6063VOY)](https://codecov.io/gh/msudgh/sync-cloud-storage)
[![License](https://img.shields.io/github/license/msudgh/sync-cloud-storage)](LICENSE)

Synchronize files and directories between a remote computer and multiple Serverless cloud providers' storage.

Supported cloud providers:

- [x] AWS S3

## Features

- Uses the latest official cloud provider's SDK
  - AWS S3: [`aws-sdk@3.x`](https://www.npmjs.com/package/aws-sdk)
- Sync multiple storages at once by just defining patterns of [`glob`](<https://en.wikipedia.org/wiki/Glob_(programming)>) strings to include or exclude files and directories
- Set the following for each synced file:
  - prefix
  - access control list (ACL)
  - tags
  - metadata
- Select a list of specific sync actions for each storage:
  - upload
  - delete

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
