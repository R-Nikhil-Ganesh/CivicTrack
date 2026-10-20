import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

describe('Health & Error Handling API', () => {
  it('GET /api/health should return 200 and operational status', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.message, 'CivicTrack API is running smoothly');
    assert.ok(res.body.timestamp);
  });

  it('GET /api/nonexistent-route should return 404 with error message', async () => {
    const res = await request(app).get('/api/nonexistent-route');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Not Found/);
  });
});
