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

describe('Issues API (/api/issues)', () => {
  before(async () => {
    await connectTestDB();
  });

  after(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('GET /api/issues (Feed & Filtering)', () => {
    it('should return empty list when no issues exist', async () => {
      const res = await request(app).get('/api/issues');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 0);
      assert.deepStrictEqual(res.body.data, []);
    });

    it('should filter issues by category', async () => {
      const { user } = await createTestUser();
      await createTestIssue(user._id, { category: 'Roads', title: 'Road damage' });
      await createTestIssue(user._id, { category: 'Water Supply', title: 'Water pipe leak' });

      const res = await request(app).get('/api/issues?category=Roads');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(res.body.data[0].category, 'Roads');
    });

    it('should filter issues by status', async () => {
      const { user } = await createTestUser();
      await createTestIssue(user._id, { status: 'Pending' });
      await createTestIssue(user._id, { status: 'Resolved' });

      const res = await request(app).get('/api/issues?status=Resolved');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(res.body.data[0].status, 'Resolved');
    });

    it('should filter issues by department', async () => {
      const { user } = await createTestUser();
      await createTestIssue(user._id, { assignedDepartment: 'Electricity', category: 'Electricity' });
      await createTestIssue(user._id, { assignedDepartment: 'Waste Management', category: 'Waste Management' });

      const res = await request(app).get('/api/issues?department=Electricity');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(res.body.data[0].assignedDepartment, 'Electricity');
    });

    it('should search issues by keyword matching title, description, or address', async () => {
      const { user } = await createTestUser();
      await createTestIssue(user._id, { title: 'Broken drainage grate', location: { address: 'MG Road', latitude: 12.97, longitude: 77.59 } });
      await createTestIssue(user._id, { title: 'Fallen tree branch', location: { address: 'Brigade Road', latitude: 12.98, longitude: 77.60 } });

      const res = await request(app).get('/api/issues?search=drainage');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 1);
      assert.match(res.body.data[0].title, /drainage/i);
    });

    it('should sort issues by upvote count descending', async () => {
      const { user: userA } = await createTestUser();
      const { user: userB } = await createTestUser();

      const issueLow = await createTestIssue(userA._id, { title: 'Low upvotes' });
      const issueHigh = await createTestIssue(userA._id, {
        title: 'High upvotes',
        upvotes: [userA._id, userB._id],
      });

      const res = await request(app).get('/api/issues?sortBy=upvotes');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data[0].title, 'High upvotes');
      assert.strictEqual(res.body.data[0].upvotes.length, 2);
    });
  });

  describe('POST /api/issues (Creation & Auto-Assignment)', () => {
    it('should create an issue, initialize statusHistory, and auto-assign department', async () => {
      const { token } = await createTestUser();

      const payload = {
        title: 'Open transformer sparking on residential lane',
        description: 'Frequent electrical sparks and buzzing sound near children park',
        category: 'Electricity',
        address: '14th Main, 4th Sector, HSR Layout',
        latitude: '12.9116',
        longitude: '77.6389',
        priority: 'Emergency',
      };

      const res = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${token}`)
        .field('title', payload.title)
        .field('description', payload.description)
        .field('category', payload.category)
        .field('address', payload.address)
        .field('latitude', payload.latitude)
        .field('longitude', payload.longitude)
        .field('priority', payload.priority);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.title, payload.title);
      assert.strictEqual(res.body.data.category, 'Electricity');
      assert.strictEqual(res.body.data.assignedDepartment, 'Electricity');
      assert.strictEqual(res.body.data.status, 'Pending');
      assert.strictEqual(res.body.data.priority, 'Emergency');
      assert.strictEqual(res.body.data.location.latitude, 12.9116);
      assert.strictEqual(res.body.data.location.longitude, 77.6389);
      assert.strictEqual(res.body.data.statusHistory.length, 1);
      assert.strictEqual(res.body.data.statusHistory[0].status, 'Pending');
    });

    it('should disallow unauthenticated users from creating issues', async () => {
      const res = await request(app)
        .post('/api/issues')
        .send({
          title: 'Unauthenticated report',
          description: 'Should be rejected',
          category: 'Roads',
        });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('GET /api/issues/:id (Details & Population)', () => {
    it('should return issue details with populated reporter information', async () => {
      const { user } = await createTestUser({ name: 'Citizen Tester' });
      const issue = await createTestIssue(user._id);

      const res = await request(app).get(`/api/issues/${issue._id}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.title, issue.title);
      assert.strictEqual(res.body.data.reportedBy.name, 'Citizen Tester');
    });

    it('should return 404 for invalid ObjectId', async () => {
      const res = await request(app).get('/api/issues/000000000000000000000000');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('PATCH /api/issues/:id/upvote (Community Upvoting)', () => {
    it('should add upvote on first request, and remove on second request (toggle)', async () => {
      const { user: author } = await createTestUser();
      const { token: voterToken } = await createTestUser();
      const issue = await createTestIssue(author._id);

      // First upvote -> Added
      const res1 = await request(app)
        .post(`/api/issues/${issue._id}/upvote`)
        .set('Authorization', `Bearer ${voterToken}`);

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res1.body.success, true);
      assert.strictEqual(res1.body.data.isUpvoted, true);
      assert.strictEqual(res1.body.data.upvotesCount, 1);

      // Second upvote -> Removed (un-upvote)
      const res2 = await request(app)
        .post(`/api/issues/${issue._id}/upvote`)
        .set('Authorization', `Bearer ${voterToken}`);

      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.success, true);
      assert.strictEqual(res2.body.data.isUpvoted, false);
      assert.strictEqual(res2.body.data.upvotesCount, 0);
    });
  });

  describe('DELETE /api/issues/:id (Safe Deletion & Ownership)', () => {
    it('should allow the author to delete their own issue', async () => {
      const { user: author, token: authorToken } = await createTestUser();
      const issue = await createTestIssue(author._id);

      const res = await request(app)
        .delete(`/api/issues/${issue._id}`)
        .set('Authorization', `Bearer ${authorToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      // Verify removed from database
      const check = await Issue.findById(issue._id);
      assert.strictEqual(check, null);
    });

    it('should allow an admin to delete any reported issue', async () => {
      const { user: author } = await createTestUser();
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const issue = await createTestIssue(author._id);

      const res = await request(app)
        .delete(`/api/issues/${issue._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      const check = await Issue.findById(issue._id);
      assert.strictEqual(check, null);
    });

    it('should reject non-author citizens from deleting someone else’s issue (403)', async () => {
      const { user: author } = await createTestUser();
      const { token: otherCitizenToken } = await createTestUser();
      const issue = await createTestIssue(author._id);

      const res = await request(app)
        .delete(`/api/issues/${issue._id}`)
        .set('Authorization', `Bearer ${otherCitizenToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /not authorized/i);

      // Ensure issue is NOT deleted
      const check = await Issue.findById(issue._id);
      assert.ok(check);
    });
  });

  describe('GET /api/issues/my-reports', () => {
    it('should return only issues reported by the authenticated user', async () => {
      const { user: userA, token: tokenA } = await createTestUser();
      const { user: userB } = await createTestUser();

      await createTestIssue(userA._id, { title: "User A's issue" });
      await createTestIssue(userB._id, { title: "User B's issue" });

      const res = await request(app)
        .get('/api/issues/my-reports')
        .set('Authorization', `Bearer ${tokenA}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(res.body.data[0].title, "User A's issue");
    });
  });
});
