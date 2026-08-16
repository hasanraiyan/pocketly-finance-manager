import { Types } from 'mongoose';
import { decodeIdCursor, encodeIdCursor } from './id-cursor';

describe('id-cursor', () => {
  it('round-trips an ObjectId through encode/decode', () => {
    const id = new Types.ObjectId();
    const cursor = encodeIdCursor(id);
    expect(decodeIdCursor(cursor).toString()).toBe(id.toString());
  });
});
