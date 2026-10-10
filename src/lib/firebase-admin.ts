import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs';
import path from 'node:path';

let projectId = process.env.FIREBASE_PROJECT_ID || 'melodic-arbor-sq6d2';
try {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (parsed?.projectId) {
      projectId = parsed.projectId;
    }
  }
} catch {
  // Fallback to default projectId
}

if (!getApps().length) {
  initializeApp({
    projectId,
  });
}

export const adminAuth = getAuth();
