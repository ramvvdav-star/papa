import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';
import { ensureSchemaBootstrapped, isDatabaseReachable } from './bootstrapSchema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  const fallbackUser = {
    id: 1,
    uid,
    email,
    displayName: displayName || email.split('@')[0] || 'Student',
    role: 'student',
    targetExam: 'JEE_MAIN',
    createdAt: new Date(),
  };

  try {
    await ensureSchemaBootstrapped();
    if (!isDatabaseReachable()) return fallbackUser;

    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'Student',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(displayName ? { displayName } : {}),
        },
      })
      .returning();

    return result[0] || fallbackUser;
  } catch {
    return fallbackUser;
  }
}

export async function getUserByUid(uid: string) {
  try {
    await ensureSchemaBootstrapped();
    if (!isDatabaseReachable()) return null;

    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] || null;
  } catch {
    return null;
  }
}
