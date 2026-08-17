/**
 * One-off migration: import pre-Clerk identities into Clerk, then repoint
 * each Pocketly profile at its new Clerk user id.
 *
 *   pnpm --filter api exec ts-node -r tsconfig-paths/register -r dotenv/config \
 *     scripts/migrate-users-to-clerk.ts [--dry-run]
 *
 * Reads the legacy `auth_users` collection directly rather than through a
 * Nest module -- the auth module it belonged to is gone, and this script has
 * to keep working against a database that predates its removal.
 *
 * Idempotent: users already imported (matched by external_id or email) are
 * skipped, so a run interrupted halfway can simply be run again. Every
 * mapping is written to scripts/.migration/clerk-user-map.json, which is the
 * audit trail if a profile ever needs reconciling by hand.
 */
import { createClerkClient } from '@clerk/express';
import { MongoClient, ObjectId } from 'mongodb';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface LegacyAuthUser {
  _id: ObjectId;
  email: string;
  passwordHash?: string | null;
  googleId?: string | null;
  emailVerified?: boolean;
}

interface Mapping {
  legacyAuthUserId: string;
  clerkUserId: string;
  email: string;
  imported: boolean;
}

const DRY_RUN = process.argv.includes('--dry-run');
const MAP_FILE = join(__dirname, '.migration', 'clerk-user-map.json');

// Clerk rate-limits the Backend API; a small serial delay is plenty for the
// user counts this app is at, and avoids needing retry/backoff machinery.
const DELAY_BETWEEN_USERS_MS = 250;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitName(name?: string): { firstName?: string; lastName?: string } {
  if (!name?.trim()) return {};
  const [first, ...rest] = name.trim().split(/\s+/);
  return {
    firstName: first,
    lastName: rest.length > 0 ? rest.join(' ') : undefined,
  };
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!mongoUri) throw new Error('MONGODB_URI is required');
  if (!clerkSecretKey) throw new Error('CLERK_SECRET_KEY is required');

  const clerk = createClerkClient({ secretKey: clerkSecretKey });
  const mongo = new MongoClient(mongoUri);
  await mongo.connect();

  try {
    const db = mongo.db();
    const legacyUsers = await db
      .collection<LegacyAuthUser>('auth_users')
      .find({})
      .toArray();
    const profiles = db.collection('users');

    console.log(
      `${legacyUsers.length} legacy identities found${DRY_RUN ? ' (dry run -- nothing will be written)' : ''}`,
    );

    const mappings: Mapping[] = [];
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const legacyUser of legacyUsers) {
      const legacyId = legacyUser._id.toString();
      const email = legacyUser.email.toLowerCase().trim();

      try {
        // Already imported? Either by external_id (a previous run of this
        // script) or by email (someone who signed up in Clerk directly).
        const existing = await clerk.users.getUserList({
          externalId: [legacyId],
          limit: 1,
        });
        const byEmail =
          existing.data.length > 0
            ? existing
            : await clerk.users.getUserList({
                emailAddress: [email],
                limit: 1,
              });

        if (byEmail.data.length > 0) {
          const clerkUser = byEmail.data[0];
          mappings.push({
            legacyAuthUserId: legacyId,
            clerkUserId: clerkUser.id,
            email,
            imported: false,
          });
          skipped += 1;
        } else if (DRY_RUN) {
          console.log(
            `would import ${email} (${legacyUser.passwordHash ? 'argon2id password' : 'no password -- Google only'})`,
          );
          skipped += 1;
          continue;
        } else {
          const profile = await profiles.findOne<{ name?: string }>({
            authUserId: legacyId,
          });
          const { firstName, lastName } = splitName(profile?.name);

          const clerkUser = await clerk.users.createUser({
            externalId: legacyId,
            emailAddress: [email],
            firstName,
            lastName,
            skipPasswordRequirement: !legacyUser.passwordHash,
            // @node-rs/argon2 emits a PHC string ($argon2id$v=19$m=...),
            // which is exactly the digest format Clerk expects.
            ...(legacyUser.passwordHash
              ? {
                  passwordDigest: legacyUser.passwordHash,
                  passwordHasher: 'argon2id' as const,
                }
              : {}),
          });

          mappings.push({
            legacyAuthUserId: legacyId,
            clerkUserId: clerkUser.id,
            email,
            imported: true,
          });
          imported += 1;
          await sleep(DELAY_BETWEEN_USERS_MS);
        }
      } catch (error) {
        failed += 1;
        console.error(`FAILED ${email}:`, (error as Error).message);
      }
    }

    // Second pass: repoint profiles at the Clerk id, keeping the old one.
    let repointed = 0;
    if (!DRY_RUN) {
      for (const mapping of mappings) {
        const result = await profiles.updateOne(
          { authUserId: mapping.legacyAuthUserId },
          {
            $set: {
              authUserId: mapping.clerkUserId,
              legacyAuthUserId: mapping.legacyAuthUserId,
            },
          },
        );
        repointed += result.modifiedCount;
      }

      mkdirSync(dirname(MAP_FILE), { recursive: true });
      writeFileSync(MAP_FILE, JSON.stringify(mappings, null, 2), 'utf-8');
    }

    const stragglers = await profiles.countDocuments({
      authUserId: { $not: /^user_/ },
    });

    console.log('---');
    console.log(`imported into Clerk : ${imported}`);
    console.log(`already present     : ${skipped}`);
    console.log(`failed              : ${failed}`);
    console.log(`profiles repointed  : ${repointed}`);
    console.log(`profiles still on a legacy id: ${stragglers}`);
    if (!DRY_RUN) console.log(`mapping written to ${MAP_FILE}`);
    if (stragglers > 0) {
      console.log(
        'Those profiles have no Clerk identity yet -- re-run, or check the FAILED lines above.',
      );
    }
  } finally {
    await mongo.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
