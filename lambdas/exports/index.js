const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const LEADS_TABLE = process.env.LEADS_TABLE_NAME;
const DATA_BUCKET = process.env.DATA_BUCKET_NAME;

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const data = JSON.parse(event.body || '{}');
    const format = data.format || 'csv'; // csv or json
    const filters = data.filters || {};

    // Fetch leads with filters
    const leads = await fetchLeads(filters);

    if (leads.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'No leads found matching filters',
          count: 0
        })
      };
    }

    // Generate export file
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-');
    const fileName = `export-${timestamp}.${format}`;
    const s3Key = `exports/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${fileName}`;

    let fileContent;
    let contentType;

    if (format === 'csv') {
      fileContent = generateCSV(leads);
      contentType = 'text/csv';
    } else {
      fileContent = JSON.stringify(leads, null, 2);
      contentType = 'application/json';
    }

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: DATA_BUCKET,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      ServerSideEncryption: 'aws:kms',
      Metadata: {
        exportedAt: date.toISOString(),
        count: String(leads.length),
        filters: JSON.stringify(filters)
      }
    }));

    // Generate presigned URL (valid for 1 hour)
    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: DATA_BUCKET,
        Key: s3Key
      }),
      { expiresIn: 3600 }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        downloadUrl: downloadUrl,
        fileName: fileName,
        count: leads.length,
        expiresIn: 3600
      })
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

async function fetchLeads(filters) {
  const leads = [];
  let lastKey = undefined;

  do {
    let result;

    if (filters.conferenceId) {
      // Query by conference
      result = await docClient.send(new QueryCommand({
        TableName: LEADS_TABLE,
        IndexName: 'GSI1-ConferenceDate',
        KeyConditionExpression: 'ConferenceID = :confId',
        ExpressionAttributeValues: {
          ':confId': filters.conferenceId
        },
        ExclusiveStartKey: lastKey
      }));
    } else {
      // Scan all
      result = await docClient.send(new ScanCommand({
        TableName: LEADS_TABLE,
        ExclusiveStartKey: lastKey
      }));
    }

    // Apply client-side filters
    const filtered = result.Items.filter(lead => {
      if (filters.status && lead.Status !== filters.status) return false;
      if (filters.businessType && lead.BusinessType !== filters.businessType) return false;
      if (filters.hasNotes && (!lead.AdminNotes || lead.AdminNotes.trim() === '')) return false;
      if (filters.consentMarketing !== undefined && lead.ConsentMarketing !== filters.consentMarketing) return false;
      if (filters.dateFrom && lead.CreatedAt < filters.dateFrom) return false;
      if (filters.dateTo && lead.CreatedAt > filters.dateTo) return false;
      if (filters.tags && filters.tags.length > 0) {
        const leadTags = lead.Tags || [];
        if (!filters.tags.some(tag => leadTags.includes(tag))) return false;
      }
      return true;
    });

    leads.push(...filtered);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return leads;
}

function generateCSV(leads) {
  // CSV headers
  const headers = [
    'LeadID',
    'ConferenceID',
    'CreatedAt',
    'Status',
    'FirstName',
    'LastName',
    'Email',
    'Phone',
    'Company',
    'Role',
    'BusinessType',
    'Interests',
    'TripWindow',
    'GroupSize',
    'Notes',
    'ConsentContact',
    'ConsentMarketing',
    'Tags',
    'AdminNotes',
    'UTM_Source',
    'UTM_Medium',
    'UTM_Campaign'
  ];

  const rows = [headers.join(',')];

  for (const lead of leads) {
    const row = [
      csvEscape(lead.LeadID),
      csvEscape(lead.ConferenceID),
      csvEscape(lead.CreatedAt),
      csvEscape(lead.Status),
      csvEscape(lead.FirstName),
      csvEscape(lead.LastName),
      csvEscape(lead.Email),
      csvEscape(lead.Phone),
      csvEscape(lead.Company),
      csvEscape(lead.Role),
      csvEscape(lead.BusinessType),
      csvEscape(Array.isArray(lead.Interests) ? lead.Interests.join('; ') : ''),
      csvEscape(lead.TripWindow),
      csvEscape(lead.GroupSize),
      csvEscape(lead.Notes),
      csvEscape(lead.ConsentContact),
      csvEscape(lead.ConsentMarketing),
      csvEscape(Array.isArray(lead.Tags) ? lead.Tags.join('; ') : ''),
      csvEscape(lead.AdminNotes),
      csvEscape(lead.UTM?.source || ''),
      csvEscape(lead.UTM?.medium || ''),
      csvEscape(lead.UTM?.campaign || '')
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
