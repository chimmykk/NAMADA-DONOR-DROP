import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initialize } from './lib/init';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(3000, async (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
    
    // Use the initialize function from lib/init.js
    try {
      await initialize();
    } catch (error) {
      console.error('Failed to initialize server:', error);
    }
  });
}); 