# Cloud Bucket Sync

A simple way to sync folders & files between a remote machine and a cloud provider's framework.

Available for following cloud frameworks:

- [Serverless](https://serverless.com/)

## Installation

```bash
npm install --save cloud-bucket-sync
```

## Usage

### Serverless

```yaml
plugins:
  - cloud-bucket-sync

custom:
  cloudBucketSync:
    - bucketName: my-bucket
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
