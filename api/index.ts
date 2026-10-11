import path from 'path';
import { fileURLToPath } from 'url';

// Force Vercel to resolve the root path to find server dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import using an absolute path reference relative to this runtime file
import app from '../server.js';

export default app;
