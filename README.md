# Sync Cloud Storage

![Codecov](https://img.shields.io/codecov/c/github/msudgh/sync-cloud-storage)

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
      prefix: assets
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
