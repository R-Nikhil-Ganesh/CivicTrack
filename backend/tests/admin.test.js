process.env.NODE_ENV = 'test';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import Issue from '../models/Issue.js';
import {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createTestUser,
  createTestIssue,
} from './setup.js';

describe('Admin & Municipal Operations API (/api/admin)', () => {
  before(async () => {
    await connectTestDB();
  });

  after(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('PATCH /api/admin/issues/:id/status (Workflow State Machine)', () => {
    it('should allow an official to update issue status to "In Progress" with comments', async () => {
      const { user: citizen } = await createTestUser({ role: 'citizen' });
      const { token: officialToken } = await createTestUser({
        name: 'Officer Rao',
        role: 'official',
        department: 'Roads',
      });

      const issue = await createTestIssue(citizen._id, {
        category: 'Roads',
        assignedDepartment: 'Roads',
        status: 'Pending',
      });

      const res = await request(app)
        .patch(`/api/admin/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${officialToken}`)
        .send({
          status: 'In Progress',
          comment: 'Road repair team dispatched with asphalt equipment',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'In Progress');
      assert.strictEqual(res.body.data.statusHistory.length, 2);
      assert.strictEqual(res.body.data.statusHistory[1].status, 'In Progress');
      assert.strictEqual(res.body.data.statusHistory[1].comment, 'Road repair team dispatched with asphalt equipment');
    });

    it('should block officials from modifying issues outside their department', async () => {
      const { user: citizen } = await createTestUser();
      const { token: waterOfficialToken } = await createTestUser({
        role: 'official',
        department: 'Water Supply',
      });

      // Issue is assigned to Roads department
      const issue = await createTestIssue(citizen._id, {
        category: 'Roads',
        assignedDepartment: 'Roads',
      });

      const res = await request(app)
        .patch(`/api/admin/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${waterOfficialToken}`)
        .send({ status: 'Resolved' });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /Water Supply/);
    });

    it('should reject invalid status names', async () => {
      const { user: citizen } = await createTestUser();
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const issue = await createTestIssue(citizen._id);

      const res = await request(app)
        .patch(`/api/admin/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'InvalidStatusName' });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /Invalid status/i);
    });

    it('should reject regular citizens from updating issue status (403)', async () => {
      const { user: citizen, token: citizenToken } = await createTestUser({ role: 'citizen' });
      const issue = await createTestIssue(citizen._id);

      const res = await request(app)
        .patch(`/api/admin/issues/${issue._id}/status`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ status: 'Resolved' });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('PATCH /api/admin/issues/:id/assign (Department Reassignment)', () => {
    it('should allow super admin to reassign issue to another department', async () => {
      const { user: citizen } = await createTestUser();
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const issue = await createTestIssue(citizen._id, {
        category: 'Roads',
        assignedDepartment: 'Roads',
      });

      const res = await request(app)
        .patch(`/api/admin/issues/${issue._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ department: 'Water Supply' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.assignedDepartment, 'Water Supply');
    });

    it('should block department officials from reassigning departments (Admin only)', async () => {
      const { user: citizen } = await createTestUser();
      const { token: officialToken } = await createTestUser({ role: 'official', department: 'Roads' });
      const issue = await createTestIssue(citizen._id);

      const res = await request(app)
        .patch(`/api/admin/issues/${issue._id}/assign`)
        .set('Authorization', `Bearer ${officialToken}`)
        .send({ department: 'Electricity' });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('GET /api/admin/stats (Analytics & KPIs)', () => {
    it('should return aggregated metrics, category stats, and department stats for admin/official', async () => {
      const { user: citizen } = await createTestUser();
      const { token: adminToken } = await createTestUser({ role: 'admin' });

      await createTestIssue(citizen._id, { category: 'Roads', status: 'Pending' });
      await createTestIssue(citizen._id, { category: 'Roads', status: 'Resolved' });
      await createTestIssue(citizen._id, { category: 'Electricity', status: 'Pending' });

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.summary.total, 3);
      assert.strictEqual(res.body.data.summary.pending, 2);
      assert.strictEqual(res.body.data.summary.resolved, 1);
      assert.strictEqual(res.body.data.summary.resolutionRate, 33);
      assert.ok(Array.isArray(res.body.data.categoryStats));
      assert.ok(Array.isArray(res.body.data.departmentStats));
    });

    it('should reject citizen access to municipal stats (403)', async () => {
      const { token: citizenToken } = await createTestUser({ role: 'citizen' });

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${citizenToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });
  });
});
