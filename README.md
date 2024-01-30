# Sync Cloud Storage

[![NPM](https://img.shields.io/npm/v/sync-cloud-storage)](https://www.npmjs.com/package/sync-cloud-storage)
[![Pipeline Status](https://github.com/msudgh/sync-cloud-storage/actions/workflows/ci.yml/badge.svg?branch=main)](./.github/workflows/ci.yml)
[![Codecov Status](https://codecov.io/gh/msudgh/sync-cloud-storage/branch/main/graph/badge.svg?token=2BY6063VOY)](https://codecov.io/gh/msudgh/sync-cloud-storage)
[![License](https://img.shields.io/github/license/msudgh/sync-cloud-storage)](LICENSE)

A simple way to sync folders & files between a remote machine and a cloud provider's framework.

Available for following cloud frameworks:

- [Serverless](https://serverless.com/)

## Installation

```bash
npm install --save sync-cloud-storage
```

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
      bucketPrefix: assets
      acl: public-read
      metadata:
        foo: bar
        bar: foo
      acl: public-read
```

## Deployments

### [Granted](https://github.com/common-fate/granted) (assume)

By using the `assume` command, you can grant access to the plugin to deploy to your cloud framework.

```bash
assume
```
