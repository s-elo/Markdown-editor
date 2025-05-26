## Can not find your config file

### 1. set by you own

add a config.json file at the root as follow

```json
{
  "docRootPath": "the doc root path",
  "ignoreDirs": [".git", "imgs"],
  // (for aliyun OSS, you can omit if you want)
  "region": "oss-cn-shenzhen",
  "accessKeyId": "your accessKeyId",
  "accessKeySecret": "your accessKeySecret",
  "bucket": "your bucket name"
}
```

### 2. set from the setting

Please take a look, there should be a setting interface around here for you to config some params.
