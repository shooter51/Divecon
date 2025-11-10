const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const QRCode = require('qrcode');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const CONFERENCES_TABLE = process.env.CONFERENCES_TABLE_NAME;
const DATA_BUCKET = process.env.DATA_BUCKET_NAME;

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const pathParams = event.pathParameters || {};

  try {
    // Route handling
    if (method === 'GET' && path.startsWith('/conference/')) {
      return await getConference(pathParams.id);
    } else if (method === 'POST' && path === '/conference') {
      return await createOrUpdateConference(event);
    } else if (method === 'GET' && path.startsWith('/qr/')) {
      return await getQRCode(event, pathParams.id);
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Route not found' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: error.statusCode || 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};

async function getConference(conferenceId) {
  const result = await docClient.send(new GetCommand({
    TableName: CONFERENCES_TABLE,
    Key: {
      ConferenceID: conferenceId
    }
  }));

  if (!result.Item) {
    throw Object.assign(new Error('Conference not found'), { statusCode: 404 });
  }

  // Don't expose internal configuration to public
  const publicConfig = {
    conferenceId: result.Item.ConferenceID,
    name: result.Item.Name,
    enabled: result.Item.Enabled,
    customFields: result.Item.CustomFields || {}
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(publicConfig)
  };
}

async function createOrUpdateConference(event) {
  const data = JSON.parse(event.body || '{}');

  if (!data.conferenceId) {
    throw Object.assign(new Error('conferenceId is required'), { statusCode: 400 });
  }

  const conference = {
    ConferenceID: data.conferenceId,
    Name: data.name || data.conferenceId,
    Enabled: data.enabled !== false,
    CustomFields: data.customFields || {},
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString()
  };

  // Check if conference exists
  const existing = await docClient.send(new GetCommand({
    TableName: CONFERENCES_TABLE,
    Key: {
      ConferenceID: data.conferenceId
    }
  }));

  if (existing.Item) {
    conference.CreatedAt = existing.Item.CreatedAt;
  }

  await docClient.send(new PutCommand({
    TableName: CONFERENCES_TABLE,
    Item: conference
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      conference: conference
    })
  };
}

async function getQRCode(event, conferenceId) {
  const queryParams = event.queryStringParameters || {};
  const format = queryParams.format || 'png'; // png or svg
  const size = parseInt(queryParams.size) || 300;

  const s3Key = `qr/${conferenceId}.${format}`;

  // Check if QR code already exists in S3
  try {
    const existing = await s3Client.send(new GetObjectCommand({
      Bucket: DATA_BUCKET,
      Key: s3Key
    }));

    // Return existing QR code
    const body = await streamToString(existing.Body);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': format === 'svg' ? 'image/svg+xml' : 'image/png',
        'Cache-Control': 'public, max-age=86400'
      },
      body: body,
      isBase64Encoded: format === 'png'
    };
  } catch (err) {
    if (err.name !== 'NoSuchKey') throw err;
  }

  // Generate new QR code
  // Get the API URL from environment or construct form URL
  const formUrl = queryParams.url || `${event.requestContext.domainName}/?conference=${conferenceId}`;

  let qrData;
  let contentType;

  if (format === 'svg') {
    qrData = await QRCode.toString(formUrl, {
      type: 'svg',
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M'
    });
    contentType = 'image/svg+xml';
  } else {
    qrData = await QRCode.toDataURL(formUrl, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M'
    });
    // Remove data URL prefix
    qrData = qrData.replace(/^data:image\/png;base64,/, '');
    contentType = 'image/png';
  }

  // Save to S3
  await s3Client.send(new PutObjectCommand({
    Bucket: DATA_BUCKET,
    Key: s3Key,
    Body: format === 'png' ? Buffer.from(qrData, 'base64') : qrData,
    ContentType: contentType,
    ServerSideEncryption: 'aws:kms',
    Metadata: {
      conferenceId: conferenceId,
      generatedAt: new Date().toISOString()
    }
  }));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400'
    },
    body: qrData,
    isBase64Encoded: format === 'png'
  };
}

async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
  });
}
