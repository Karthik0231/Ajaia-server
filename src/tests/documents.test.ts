import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/User';
import Document from '../models/Document';
import Share from '../models/Share';
import { startTestDb, stopTestDb, clearCollections } from './testDb';

/**
 * Document Authorization + Edge-Case Integration Tests
 *
 * Uses an isolated mongodb-memory-server instance.
 * The developer's MONGODB_URI is NEVER touched.
 *
 * NOTE: The first run downloads the MongoDB binary (~780 MB).
 * Subsequent runs use the cached binary and are fast (<5 s).
 *
 * Authorization tests:
 *   1. Owner can PATCH their own document → 200
 *   2. Non-shared user PATCH → 403
 *   3. Viewer PATCH → 403
 *   4. Editor PATCH → 200
 *
 * Edge-case tests:
 *   5. Missing x-user-id → 401
 *   6. Invalid ObjectId as x-user-id → 401
 *   7. Invalid document ObjectId → 404
 *   8. Nonexistent document → 404
 *   9. Non-owner DELETE → 403
 *  10. Owner DELETE → 200
 *  11. Invalid share permission → 400
 *  12. Share with self → 400
 */

describe('Document API – Authorization & Edge Cases', () => {
  let alexId: string;
  let priyaId: string;
  let docId: string;

  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearCollections();

    const alex = await User.create({ name: 'Alex Johnson', email: 'alex@test.dev' });
    const priya = await User.create({ name: 'Priya Sharma', email: 'priya@test.dev' });
    alexId = alex._id.toString();
    priyaId = priya._id.toString();

    const doc = await Document.create({
      title: "Alex's Document",
      content: { type: 'doc', content: [] },
      ownerId: new mongoose.Types.ObjectId(alexId),
    });
    docId = doc._id.toString();
  });

  // ── Authorization ──────────────────────────────────────────────────────────

  it('1. owner can PATCH their own document → 200', async () => {
    const res = await request(app)
      .patch(`/api/documents/${docId}`)
      .set('x-user-id', alexId)
      .send({ title: 'Updated by Owner' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Updated by Owner');
  });

  it('2. non-shared user PATCH → 403', async () => {
    const res = await request(app)
      .patch(`/api/documents/${docId}`)
      .set('x-user-id', priyaId)
      .send({ title: 'Should Be Rejected' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. viewer PATCH → 403', async () => {
    await Share.create({
      documentId: new mongoose.Types.ObjectId(docId),
      userId: new mongoose.Types.ObjectId(priyaId),
      permission: 'viewer',
    });

    const res = await request(app)
      .patch(`/api/documents/${docId}`)
      .set('x-user-id', priyaId)
      .send({ title: 'Viewer Should Not Edit' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('4. editor PATCH → 200', async () => {
    await Share.create({
      documentId: new mongoose.Types.ObjectId(docId),
      userId: new mongoose.Types.ObjectId(priyaId),
      permission: 'editor',
    });

    const res = await request(app)
      .patch(`/api/documents/${docId}`)
      .set('x-user-id', priyaId)
      .send({ title: 'Editor Edit' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Edge Cases ─────────────────────────────────────────────────────────────

  it('5. missing x-user-id → 401', async () => {
    const res = await request(app)
      .patch(`/api/documents/${docId}`)
      .send({ title: 'No Header' });

    expect(res.status).toBe(401);
  });

  it('6. invalid ObjectId as x-user-id → 401', async () => {
    const res = await request(app)
      .patch(`/api/documents/${docId}`)
      .set('x-user-id', 'not-a-valid-id')
      .send({ title: 'Bad Header' });

    expect(res.status).toBe(401);
  });

  it('7. invalid document ObjectId → 404', async () => {
    const res = await request(app)
      .get('/api/documents/bad-id')
      .set('x-user-id', alexId);

    expect(res.status).toBe(404);
  });

  it('8. nonexistent document → 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/documents/${fakeId}`)
      .set('x-user-id', alexId);

    expect(res.status).toBe(404);
  });

  it('9. non-owner DELETE → 403', async () => {
    const res = await request(app)
      .delete(`/api/documents/${docId}`)
      .set('x-user-id', priyaId);

    expect(res.status).toBe(403);
  });

  it('10. owner DELETE → 200', async () => {
    const res = await request(app)
      .delete(`/api/documents/${docId}`)
      .set('x-user-id', alexId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('11. invalid share permission → 400', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/share`)
      .set('x-user-id', alexId)
      .send({ userId: priyaId, permission: 'superuser' });

    expect(res.status).toBe(400);
  });

  it('12. sharing with self → 400', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/share`)
      .set('x-user-id', alexId)
      .send({ userId: alexId, permission: 'editor' });

    expect(res.status).toBe(400);
  });
});
