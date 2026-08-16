import { Types } from 'mongoose';
import { decodeCursor, encodeCursor } from './cursor';

describe('cursor', () => {
  it('round-trips date + id through encode/decode', () => {
    const doc = {
      date: new Date('2026-08-16T10:00:00.000Z'),
      _id: new Types.ObjectId(),
    };
    const cursor = encodeCursor(doc);
    const decoded = decodeCursor(cursor);

    expect(decoded.date.toISOString()).toBe(doc.date.toISOString());
    expect(decoded.id.toString()).toBe(doc._id.toString());
  });
});
