import { google } from 'googleapis';

const CALENDAR_ID = 'petardo.sjdr@gmail.com';

const CREDENTIALS = {
  type: 'service_account',
  project_id: 'petardo-calendar',
  private_key_id: 'e30101bede89703f25bdf87159ab47853269ab2e',
  private_key: (() => {
    let key = process.env.GOOGLE_PRIVATE_KEY || '';
    if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
    key = key.replace(/\\n/g, '\n');
    if (!key.includes('\n')) {
      key = key.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
      key = key.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----\n');
      key = key.replace(/([^\n]{64})/g, '$1\n');
      key = key.replace(/\n\n/g, '\n');
    }
    return key;
  })(),
  client_email: 'petardo-calendar@petardo-calendar.iam.gserviceaccount.com',
  client_id: '107316861424006297966',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
};

async function test() {
  console.log('Testing auth with key length:', CREDENTIALS.private_key.length);
  const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + 86400000).toISOString(),
        timeZone: 'America/Sao_Paulo',
        items: [{ id: CALENDAR_ID }],
      },
    });
    console.log('SUCCESS:', res.data.calendars[CALENDAR_ID]);
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

test();
