import { google } from 'googleapis';

const CALENDAR_ID = 'petardo.sjdr@gmail.com';

const CREDENTIALS = {
  type: 'service_account',
  project_id: (() => {
    let key = process.env.GOOGLE_PRIVATE_KEY || '';
    if (key.startsWith('{')) {
      try {
        const parsed = JSON.parse(key);
        if (parsed.project_id) return parsed.project_id;
      } catch (e) {}
    }
    return 'petardo-calendar';
  })(),
  private_key: (() => {
    let key = process.env.GOOGLE_PRIVATE_KEY || '';
    if (key.startsWith('{')) {
      try {
        const parsed = JSON.parse(key);
        if (parsed.private_key) key = parsed.private_key;
      } catch (e) {}
    }
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
  client_email: (() => {
    let key = process.env.GOOGLE_PRIVATE_KEY || '';
    if (key.startsWith('{')) {
      try {
        const parsed = JSON.parse(key);
        if (parsed.client_email) return parsed.client_email;
      } catch (e) {}
    }
    return 'petardo-calendar@petardo-calendar.iam.gserviceaccount.com';
  })(),
  client_id: (() => {
    let key = process.env.GOOGLE_PRIVATE_KEY || '';
    if (key.startsWith('{')) {
      try {
        const parsed = JSON.parse(key);
        if (parsed.client_id) return parsed.client_id;
      } catch (e) {}
    }
    return '107316861424006297966';
  })(),
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
};

function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const calendar = getCalendarClient();

  try {
    // GET: Fetch busy times for slot generation
    if (req.method === 'GET') {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate required' });
      }

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: new Date(startDate).toISOString(),
          timeMax: new Date(endDate).toISOString(),
          timeZone: 'America/Sao_Paulo',
          items: [{ id: CALENDAR_ID }],
        },
      });

      const busy = response.data.calendars?.[CALENDAR_ID]?.busy || [];
      return res.status(200).json({ busy });
    }

    // POST: Create a new calendar event
    if (req.method === 'POST') {
      const { title, description, startTime, endTime, location } = req.body;

      if (!title || !startTime || !endTime) {
        return res.status(400).json({ error: 'title, startTime and endTime required' });
      }

      const event = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: {
          summary: title,
          description: description || '',
          location: location || '',
          start: {
            dateTime: startTime,
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: endTime,
            timeZone: 'America/Sao_Paulo',
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
            ],
          },
        },
      });

      return res.status(200).json({
        success: true,
        eventId: event.data.id,
        htmlLink: event.data.htmlLink,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Google Calendar API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
