import { Types } from 'mongoose';

/**
 * Cursor pagination keyed on (upvoteCount, _id), for the one list sorted by
 * a mutable ranking field rather than insertion order (admin feedback's
 * "most upvoted first" view) -- an _id-only cursor breaks here the same way
 * it would for transactions sorted by date instead of insertion order (see
 * date-cursor.ts).
 */
export interface UpvoteCursorPayload {
  upvoteCount: number;
  id: Types.ObjectId;
}

export function encodeUpvoteCursor(doc: {
  upvoteCount: number;
  _id: Types.ObjectId;
}): string {
  return Buffer.from(
    JSON.stringify({ upvoteCount: doc.upvoteCount, id: doc._id.toString() }),
  ).toString('base64url');
}

export function decodeUpvoteCursor(cursor: string): UpvoteCursorPayload {
  const { upvoteCount, id } = JSON.parse(
    Buffer.from(cursor, 'base64url').toString('utf8'),
  ) as { upvoteCount: number; id: string };
  return { upvoteCount, id: new Types.ObjectId(id) };
}
