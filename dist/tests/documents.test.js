"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("../app"));
const User_1 = __importDefault(require("../models/User"));
const Document_1 = __importDefault(require("../models/Document"));
const Share_1 = __importDefault(require("../models/Share"));
const testDb_1 = require("./testDb");
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
(0, vitest_1.describe)('Document API – Authorization & Edge Cases', () => {
    let alexId;
    let priyaId;
    let docId;
    (0, vitest_1.beforeAll)(async () => {
        await (0, testDb_1.startTestDb)();
    });
    (0, vitest_1.afterAll)(async () => {
        await (0, testDb_1.stopTestDb)();
    });
    (0, vitest_1.beforeEach)(async () => {
        await (0, testDb_1.clearCollections)();
        const alex = await User_1.default.create({ name: 'Alex Johnson', email: 'alex@test.dev' });
        const priya = await User_1.default.create({ name: 'Priya Sharma', email: 'priya@test.dev' });
        alexId = alex._id.toString();
        priyaId = priya._id.toString();
        const doc = await Document_1.default.create({
            title: "Alex's Document",
            content: { type: 'doc', content: [] },
            ownerId: new mongoose_1.default.Types.ObjectId(alexId),
        });
        docId = doc._id.toString();
    });
    // ── Authorization ──────────────────────────────────────────────────────────
    (0, vitest_1.it)('1. owner can PATCH their own document → 200', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .patch(`/api/documents/${docId}`)
            .set('x-user-id', alexId)
            .send({ title: 'Updated by Owner' });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.title).toBe('Updated by Owner');
    });
    (0, vitest_1.it)('2. non-shared user PATCH → 403', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .patch(`/api/documents/${docId}`)
            .set('x-user-id', priyaId)
            .send({ title: 'Should Be Rejected' });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.success).toBe(false);
    });
    (0, vitest_1.it)('3. viewer PATCH → 403', async () => {
        await Share_1.default.create({
            documentId: new mongoose_1.default.Types.ObjectId(docId),
            userId: new mongoose_1.default.Types.ObjectId(priyaId),
            permission: 'viewer',
        });
        const res = await (0, supertest_1.default)(app_1.default)
            .patch(`/api/documents/${docId}`)
            .set('x-user-id', priyaId)
            .send({ title: 'Viewer Should Not Edit' });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.success).toBe(false);
    });
    (0, vitest_1.it)('4. editor PATCH → 200', async () => {
        await Share_1.default.create({
            documentId: new mongoose_1.default.Types.ObjectId(docId),
            userId: new mongoose_1.default.Types.ObjectId(priyaId),
            permission: 'editor',
        });
        const res = await (0, supertest_1.default)(app_1.default)
            .patch(`/api/documents/${docId}`)
            .set('x-user-id', priyaId)
            .send({ title: 'Editor Edit' });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
    });
    // ── Edge Cases ─────────────────────────────────────────────────────────────
    (0, vitest_1.it)('5. missing x-user-id → 401', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .patch(`/api/documents/${docId}`)
            .send({ title: 'No Header' });
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)('6. invalid ObjectId as x-user-id → 401', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .patch(`/api/documents/${docId}`)
            .set('x-user-id', 'not-a-valid-id')
            .send({ title: 'Bad Header' });
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)('7. invalid document ObjectId → 404', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/documents/bad-id')
            .set('x-user-id', alexId);
        (0, vitest_1.expect)(res.status).toBe(404);
    });
    (0, vitest_1.it)('8. nonexistent document → 404', async () => {
        const fakeId = new mongoose_1.default.Types.ObjectId().toString();
        const res = await (0, supertest_1.default)(app_1.default)
            .get(`/api/documents/${fakeId}`)
            .set('x-user-id', alexId);
        (0, vitest_1.expect)(res.status).toBe(404);
    });
    (0, vitest_1.it)('9. non-owner DELETE → 403', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .delete(`/api/documents/${docId}`)
            .set('x-user-id', priyaId);
        (0, vitest_1.expect)(res.status).toBe(403);
    });
    (0, vitest_1.it)('10. owner DELETE → 200', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .delete(`/api/documents/${docId}`)
            .set('x-user-id', alexId);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
    });
    (0, vitest_1.it)('11. invalid share permission → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/documents/${docId}/share`)
            .set('x-user-id', alexId)
            .send({ userId: priyaId, permission: 'superuser' });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
    (0, vitest_1.it)('12. sharing with self → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/documents/${docId}/share`)
            .set('x-user-id', alexId)
            .send({ userId: alexId, permission: 'editor' });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
