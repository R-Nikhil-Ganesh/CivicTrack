process.env.NODE_ENV = 'test';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import { connectTestDB, clearTestDB, disconnectTestDB, createTestUser } from './setup.js';

describe('Authentication API (/api/auth)', () => {
  before(async () => {
    await connectTestDB();
  });

  after(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new citizen successfully with default role', async () => {
      const payload = {
        name: 'Rohan Sharma',
        email: 'rohan.sharma@example.com',
        password: 'securePassword123',
        phone: '9876543210',
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(payload);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.name, 'Rohan Sharma');
      assert.strictEqual(res.body.data.email, 'rohan.sharma@example.com');
      assert.strictEqual(res.body.data.role, 'citizen');
      assert.strictEqual(res.body.data.department, 'None');
      assert.ok(res.body.data.token, 'Should return JWT token');
      assert.strictEqual(res.body.data.password, undefined, 'Password should not be returned');

      // Verify stored password in database is bcrypt-hashed
      const stored = await User.findOne({ email: payload.email }).select('+password');
      assert.ok(stored);
      assert.notStrictEqual(stored.password, 'securePassword123');
      assert.match(stored.password, /^\$2[aby]\$/);
    });

    it('should reject registration if email is already registered', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'duplicate@example.com',
          password: 'password123',
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /already exists/i);
    });

    it('should register an official with assigned department', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Officer Priya',
          email: 'priya.official@civictrack.gov',
          password: 'officialSecret123',
          role: 'official',
          department: 'Roads',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.role, 'official');
      assert.strictEqual(res.body.data.department, 'Roads');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user with valid credentials and return JWT', async () => {
      await createTestUser({
        email: 'citizen.login@example.com',
        password: 'correctPassword99',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'citizen.login@example.com',
          password: 'correctPassword99',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.strictEqual(res.body.data.email, 'citizen.login@example.com');
    });

    it('should reject login with incorrect password', async () => {
      await createTestUser({
        email: 'citizen.wrongpass@example.com',
        password: 'correctPassword99',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'citizen.wrongpass@example.com',
          password: 'incorrectPassword',
        });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /invalid email or password/i);
    });

    it('should reject login when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'missingpass@example.com' });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /both email and password/i);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile when authenticated with valid Bearer token', async () => {
      const { user, token } = await createTestUser({ name: 'Verified Citizen' });

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.name, 'Verified Citizen');
      assert.strictEqual(res.body.data.password, undefined);
    });

    it('should reject request when Authorization header is absent', async () => {
      const res = await request(app).get('/api/auth/profile');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /no token provided/i);
    });

    it('should reject request when token is malformed or forged', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.tampered.token');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /token invalid or expired/i);
    });
  });
});
