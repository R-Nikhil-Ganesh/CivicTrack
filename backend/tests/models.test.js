process.env.NODE_ENV = 'test';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import User from '../models/User.js';
import Issue from '../models/Issue.js';
import { connectTestDB, clearTestDB, disconnectTestDB, createTestUser } from './setup.js';

describe('Mongoose Models Unit Tests', () => {
  before(async () => {
    await connectTestDB();
  });

  after(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('User Model', () => {
    it('should fail validation when required fields are missing', async () => {
      const user = new User({});
      let err;
      try {
        await user.validate();
      } catch (e) {
        err = e;
      }
      assert.ok(err);
      assert.ok(err.errors.name);
      assert.ok(err.errors.email);
      assert.ok(err.errors.password);
    });

    it('should reject invalid email formats', async () => {
      const user = new User({
        name: 'Invalid Email User',
        email: 'not-an-email-address',
        password: 'password123',
      });
      let err;
      try {
        await user.validate();
      } catch (e) {
        err = e;
      }
      assert.ok(err);
      assert.ok(err.errors.email);
      assert.match(err.errors.email.message, /valid email/i);
    });

    it('should reject passwords shorter than 6 characters', async () => {
      const user = new User({
        name: 'Short Pass User',
        email: 'shortpass@example.com',
        password: '123',
      });
      let err;
      try {
        await user.validate();
      } catch (e) {
        err = e;
      }
      assert.ok(err);
      assert.ok(err.errors.password);
      assert.match(err.errors.password.message, /at least 6 characters/i);
    });

    it('should correctly hash password and compare with comparePassword()', async () => {
      const plain = 'mySecretPassword99';
      const user = await User.create({
        name: 'Hash Tester',
        email: 'hashtest@example.com',
        password: plain,
      });

      assert.notStrictEqual(user.password, plain);
      const isMatch = await user.comparePassword(plain);
      assert.strictEqual(isMatch, true);

      const isMismatch = await user.comparePassword('wrongSecret');
      assert.strictEqual(isMismatch, false);
    });
  });

  describe('Issue Model', () => {
    it('should auto-map category to assignedDepartment and initialize statusHistory', async () => {
      const { user } = await createTestUser();

      const issue = await Issue.create({
        title: 'Burst water pipe flooding junction',
        description: 'Clean drinking water gushing onto the road since morning',
        category: 'Water Supply',
        location: {
          address: 'Indiranagar 100ft road',
          latitude: 12.9784,
          longitude: 77.6408,
        },
        reportedBy: user._id,
      });

      assert.strictEqual(issue.assignedDepartment, 'Water Supply');
      assert.strictEqual(issue.status, 'Pending');
      assert.strictEqual(issue.statusHistory.length, 1);
      assert.strictEqual(issue.statusHistory[0].status, 'Pending');
      assert.strictEqual(issue.statusHistory[0].updatedBy.toString(), user._id.toString());
    });

    it('should reject invalid category not in allowed enums', async () => {
      const { user } = await createTestUser();
      const issue = new Issue({
        title: 'Invalid Category Test',
        description: 'Testing enum validation',
        category: 'Space Exploration',
        location: {
          address: 'Test Address',
          latitude: 12.97,
          longitude: 77.59,
        },
        reportedBy: user._id,
      });

      let err;
      try {
        await issue.validate();
      } catch (e) {
        err = e;
      }
      assert.ok(err);
      assert.ok(err.errors.category);
    });

    it('should enforce title length maximum of 120 characters', async () => {
      const { user } = await createTestUser();
      const longTitle = 'A'.repeat(121);
      const issue = new Issue({
        title: longTitle,
        description: 'Test description',
        category: 'Roads',
        location: {
          address: 'Test',
          latitude: 12.9,
          longitude: 77.5,
        },
        reportedBy: user._id,
      });

      let err;
      try {
        await issue.validate();
      } catch (e) {
        err = e;
      }
      assert.ok(err);
      assert.ok(err.errors.title);
      assert.match(err.errors.title.message, /cannot exceed 120/i);
    });
  });
});
