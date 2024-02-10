# Sync Cloud Storage

[![NPM](https://img.shields.io/npm/v/sync-cloud-storage)](https://www.npmjs.com/package/sync-cloud-storage)
[![Pipeline Status](https://github.com/msudgh/sync-cloud-storage/actions/workflows/ci.yml/badge.svg?branch=main)](./.github/workflows/ci.yml)
[![Codecov Status](https://codecov.io/gh/msudgh/sync-cloud-storage/branch/main/graph/badge.svg?token=2BY6063VOY)](https://codecov.io/gh/msudgh/sync-cloud-storage)
[![License](https://img.shields.io/github/license/msudgh/sync-cloud-storage)](LICENSE)

A simple way to sync folders & files between a remote machine and a cloud provider's storage.

Available for following cloud frameworks:

- [Serverless](https://serverless.com/)

> **Note**: This plugin is still in development and may not be stable. Use with caution.

## Installation

1. [**ni**](https://github.com/antfu/ni): `ni sync-cloud-storage -D`
2. [**npm**](https://npmjs.com/): `npm i sync-cloud-storage -D`
3. [**yarn**](https://yarnpkg.com/): `yarn add sync-cloud-storage -D`
4. [**pnpm**](https://pnpm.io/): `pnpm add sync-cloud-storage -D`

## Why

- Uses the latest official cloud provider's SDK.
- Sync multiple storages at once.
- Sync tags and metadata of each storage.

## Usage

### Serverless

```yaml
plugins:
  - sync-cloud-storage

custom:
  syncCloudStorage:
    - name: my-bucket
      localPath: ./assets
      actions:
        - upload
        - delete
      prefix: assets
      acl: public-read
      metadata:
        foo: bar
        bar: foo
```
