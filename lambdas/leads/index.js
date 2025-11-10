const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { ulid } = require('ulid');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const LEADS_TABLE = process.env.LEADS_TABLE_NAME;
const DATA_BUCKET = process.env.DATA_BUCKET_NAME;

// Validation utilities
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone) => {
  // E.164 format validation (optional field)
  if (!phone) return true;
  const re = /^\+[1-9]\d{1,14}$/;
  return re.test(phone);
};

const validateRequired = (data, fields) => {
  const missing = fields.filter(field => {
    const value = data[field];
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (typeof value === 'boolean') return false; // Boolean values are valid
    return !value; // Other falsy values are missing
  });
  if (missing.length > 0) {
    throw Object.assign(new Error(`Missing required fields: ${missing.join(', ')}`), { statusCode: 400 });
  }
};

// Honeypot check
const checkHoneypot = (data) => {
  if (data.website || data.url || data.homepage) {
    throw Object.assign(new Error('Spam detected'), { statusCode: 400 });
  }
};

// Sanitize input
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().substring(0, 1000); // Max 1000 chars per field
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const pathParams = event.pathParameters || {};

  try {
    // Route handling
    if (method === 'POST' && path === '/leads') {
      return await createLead(event);
    } else if (method === 'GET' && path === '/leads') {
      return await listLeads(event);
    } else if (method === 'GET' && path.startsWith('/leads/')) {
      return await getLead(event, pathParams.id);
    } else if (method === 'PATCH' && path.startsWith('/leads/')) {
      return await updateLead(event, pathParams.id);
    } else if (method === 'DELETE' && path.startsWith('/leads/')) {
      return await deleteLead(event, pathParams.id);
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

async function createLead(event) {
  const data = JSON.parse(event.body || '{}');

  // Honeypot check
  checkHoneypot(data);

  // Validate required fields
  validateRequired(data, ['firstName', 'lastName', 'email', 'company', 'conferenceId', 'consentContact']);

  // Validate email
  if (!validateEmail(data.email)) {
    throw Object.assign(new Error('Invalid email format'), { statusCode: 400 });
  }

  // Validate phone if provided
  if (data.phone && !validatePhone(data.phone)) {
    throw Object.assign(new Error('Invalid phone format (use E.164 format, e.g., +15551234567)'), { statusCode: 400 });
  }

  // Validate consent
  if (data.consentContact !== true && data.consentContact !== 'true') {
    throw Object.assign(new Error('Contact consent is required'), { statusCode: 400 });
  }

  // Generate ULID for lead
  const leadId = ulid();
  const timestamp = new Date().toISOString();
  const conferenceId = sanitizeString(data.conferenceId);

  // Sanitize all input
  const lead = {
    PK: `${conferenceId}#${leadId}`,
    LeadID: leadId,
    ConferenceID: conferenceId,
    Email: sanitizeString(data.email).toLowerCase(),
    FirstName: sanitizeString(data.firstName),
    LastName: sanitizeString(data.lastName),
    Company: sanitizeString(data.company),
    Role: sanitizeString(data.role || ''),
    Phone: sanitizeString(data.phone || ''),
    BusinessType: sanitizeString(data.businessType || ''),
    Interests: Array.isArray(data.interests) ? data.interests.map(sanitizeString) : [],
    TripWindow: sanitizeString(data.tripWindow || ''),
    GroupSize: parseInt(data.groupSize) || 0,
    Notes: sanitizeString(data.notes || ''),
    ConsentContact: true,
    ConsentMarketing: data.consentMarketing === true || data.consentMarketing === 'true',
    UTM: {
      source: sanitizeString(data.utm_source || ''),
      medium: sanitizeString(data.utm_medium || ''),
      campaign: sanitizeString(data.utm_campaign || ''),
    },
    UserAgent: event.requestContext.http.userAgent || '',
    SourceIP: event.requestContext.http.sourceIp || '',
    CreatedAt: timestamp,
    UpdatedAt: timestamp,
    Status: 'new',
    Tags: [],
    AdminNotes: ''
  };

  // Write to DynamoDB
  await docClient.send(new PutCommand({
    TableName: LEADS_TABLE,
    Item: lead,
    ConditionExpression: 'attribute_not_exists(PK)'
  }));

  // Archive raw JSON to S3
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const s3Key = `raw/${year}/${month}/${day}/${conferenceId}/${leadId}.json`;

  await s3Client.send(new PutObjectCommand({
    Bucket: DATA_BUCKET,
    Key: s3Key,
    Body: JSON.stringify({ ...lead, rawInput: data }, null, 2),
    ContentType: 'application/json',
    ServerSideEncryption: 'aws:kms'
  }));

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      leadId: leadId,
      message: 'Lead captured successfully'
    })
  };
}

async function listLeads(event) {
  const queryParams = event.queryStringParameters || {};
  const conferenceId = queryParams.conferenceId;
  const limit = parseInt(queryParams.limit) || 50;
  const lastKey = queryParams.lastKey ? JSON.parse(Buffer.from(queryParams.lastKey, 'base64').toString()) : undefined;

  let items;
  let nextKey;

  if (conferenceId) {
    // Query by conference using GSI1
    const result = await docClient.send(new QueryCommand({
      TableName: LEADS_TABLE,
      IndexName: 'GSI1-ConferenceDate',
      KeyConditionExpression: 'ConferenceID = :confId',
      ExpressionAttributeValues: {
        ':confId': conferenceId
      },
      Limit: limit,
      ExclusiveStartKey: lastKey,
      ScanIndexForward: false // Most recent first
    }));
    items = result.Items;
    nextKey = result.LastEvaluatedKey;
  } else {
    // Scan all leads (admin only)
    const result = await docClient.send(new ScanCommand({
      TableName: LEADS_TABLE,
      Limit: limit,
      ExclusiveStartKey: lastKey
    }));
    items = result.Items;
    nextKey = result.LastEvaluatedKey;
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leads: items,
      nextKey: nextKey ? Buffer.from(JSON.stringify(nextKey)).toString('base64') : null,
      count: items.length
    })
  };
}

async function getLead(event, leadId) {
  const queryParams = event.queryStringParameters || {};
  const conferenceId = queryParams.conferenceId;

  if (!conferenceId) {
    throw Object.assign(new Error('conferenceId query parameter is required'), { statusCode: 400 });
  }

  const result = await docClient.send(new GetCommand({
    TableName: LEADS_TABLE,
    Key: {
      PK: `${conferenceId}#${leadId}`
    }
  }));

  if (!result.Item) {
    throw Object.assign(new Error('Lead not found'), { statusCode: 404 });
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.Item)
  };
}

async function updateLead(event, leadId) {
  const data = JSON.parse(event.body || '{}');
  const queryParams = event.queryStringParameters || {};
  const conferenceId = queryParams.conferenceId;

  if (!conferenceId) {
    throw Object.assign(new Error('conferenceId query parameter is required'), { statusCode: 400 });
  }

  // Only allow updating specific fields
  const allowedFields = ['Status', 'Tags', 'AdminNotes'];
  const updates = {};
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  const updateExpressions = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = field === 'Tags' ?
        (Array.isArray(data[field]) ? data[field].map(sanitizeString) : []) :
        sanitizeString(data[field]);
      expressionAttributeNames[`#${field}`] = field;
      expressionAttributeValues[`:${field}`] = updates[field];
      updateExpressions.push(`#${field} = :${field}`);
    }
  }

  if (updateExpressions.length === 0) {
    throw Object.assign(new Error('No valid fields to update'), { statusCode: 400 });
  }

  // Always update UpdatedAt
  expressionAttributeNames['#UpdatedAt'] = 'UpdatedAt';
  expressionAttributeValues[':UpdatedAt'] = new Date().toISOString();
  updateExpressions.push('#UpdatedAt = :UpdatedAt');

  const result = await docClient.send(new UpdateCommand({
    TableName: LEADS_TABLE,
    Key: {
      PK: `${conferenceId}#${leadId}`
    },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.Attributes)
  };
}

async function deleteLead(event, leadId) {
  const queryParams = event.queryStringParameters || {};
  const conferenceId = queryParams.conferenceId;

  if (!conferenceId) {
    throw Object.assign(new Error('conferenceId query parameter is required'), { statusCode: 400 });
  }

  // First check if the lead exists
  const checkResult = await docClient.send(new GetCommand({
    TableName: LEADS_TABLE,
    Key: {
      PK: `${conferenceId}#${leadId}`
    }
  }));

  if (!checkResult.Item) {
    throw Object.assign(new Error('Lead not found'), { statusCode: 404 });
  }

  // Delete the lead
  await docClient.send(new DeleteCommand({
    TableName: LEADS_TABLE,
    Key: {
      PK: `${conferenceId}#${leadId}`
    }
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      message: 'Lead deleted successfully',
      leadId: leadId,
      conferenceId: conferenceId
    })
  };
}
