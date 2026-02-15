const { S3Client, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand, PutBucketWebsiteCommand, PutObjectCommand } = require('@aws-sdk/client-s3')
const path = require('path')
const fs = require('fs')
const mime = require('mime-types')

async function ensureBucket(client, bucket, region) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
    return
  } catch (e) {
    await client.send(new CreateBucketCommand({ Bucket: bucket }))
    try {
      if (process.env.ALLOW_PUBLIC_POLICY === 'true') {
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicReadGetObject',
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`]
            }
          ]
        }
        await client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(policy) }))
        const website = {
          IndexDocument: { Suffix: 'index.html' },
          ErrorDocument: { Key: 'index.html' }
        }
        await client.send(new PutBucketWebsiteCommand({ Bucket: bucket, WebsiteConfiguration: website }))
      }
    } catch {}
  }
}

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) files.push(...listFiles(p))
    else files.push(p)
  }
  return files
}

async function uploadDir(distDir, bucket, region) {
  const client = new S3Client({ region })
  await ensureBucket(client, bucket, region)
  const files = listFiles(distDir)
  for (const file of files) {
    const rel = path.relative(distDir, file).replace(/\\/g, '/')
    const contentType = mime.lookup(file) || 'application/octet-stream'
    const body = fs.readFileSync(file)
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: rel, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }))
  }
  console.log('UI uploaded to bucket:', bucket)
}

async function main() {
  const region = process.env.AWS_REGION || 'us-east-1'
  const bucket = process.env.UI_BUCKET_NAME || 'sync2gear-ui-prod'
  const distDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..', 'frontend', 'dist')
  if (!fs.existsSync(distDir)) {
    console.error('Dist directory not found:', distDir)
    process.exit(1)
  }
  await uploadDir(distDir, bucket, region)
}

main().catch((e) => {
  console.error('Deploy UI failed:', e.message)
  process.exit(1)
})
