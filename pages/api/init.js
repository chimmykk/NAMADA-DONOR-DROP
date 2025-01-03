import { initialize } from '../../lib/init';

let initialized = false;

export default async function handler(req, res) {
  // Check for secret token
  if (req.headers['x-init-token'] !== process.env.NEXT_PUBLIC_INIT_SECRET) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Only allow requests from our own server
  if (req.headers.host !== process.env.NEXT_PUBLIC_ALLOWED_HOST) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (!initialized) {
    try {
      // Get skipInitialScrape from query parameter
      const skipInitialScrape = req.query.skipInitialScrape === 'true';
      await initialize(skipInitialScrape);
      initialized = true;
      res.status(200).json({ status: 'initialized', skipInitialScrape });
    } catch (error) {
      console.error('Initialization failed:', error);
      res.status(500).json({ error: 'Failed to initialize' });
    }
  } else {
    res.status(200).json({ status: 'already initialized' });
  }
} 