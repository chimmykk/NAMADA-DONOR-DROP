import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set your Google Sheets ID and range from environment variables
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RANGE = process.env.SHEET_RANGE || 'Sheet1!A:H'; // Default range if not specified

const sheets = google.sheets('v4');

// Configure the Google Sheets API client
async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY, // Path to your service account key file from .env
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], // Read-only scope
  });
  return await auth.getClient();
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const authClient = await authenticate();
      const request = {
        spreadsheetId: SPREADSHEET_ID,
        range: RANGE,
        auth: authClient,
      };

      const response = await sheets.spreadsheets.values.get(request);
      const rows = response.data.values;

      if (rows.length) {
        res.status(200).json({ success: true, data: rows });
      } else {
        res.status(404).json({ success: false, message: 'No data found.' });
      }
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch data' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
