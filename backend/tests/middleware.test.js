process.env.NODE_ENV = 'test';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { notFound, errorHandler } from '../middleware/errorMiddleware.js';
import { connectTestDB, clearTestDB, disconnectTestDB, createTestUser, generateTestToken } from './setup.js';

describe('Middleware Unit & Integration Tests', () => {
  before(async () => {
    await connectTestDB();
  });

  after(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('authMiddleware: protect()', () => {
    it('should attach req.user and invoke next() when valid token is provided', async () => {
      const { user, token } = await createTestUser();

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const res = {};
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await protect(req, res, next);
      assert.strictEqual(nextCalled, true);
      assert.ok(req.user);
      assert.strictEqual(req.user._id.toString(), user._id.toString());
    });

    it('should return 401 when Authorization header is absent', async () => {
      const req = { headers: {} };
      let statusCode = null;
      let jsonPayload = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonPayload = data;
        },
      };

      await protect(req, res, () => {});
      assert.strictEqual(statusCode, 401);
      assert.strictEqual(jsonPayload.success, false);
      assert.match(jsonPayload.message, /no token provided/i);
    });

    it('should return 401 when token is invalid or expired', async () => {
      const req = {
        headers: {
          authorization: 'Bearer bad.token.here',
        },
      };
      let statusCode = null;
      let jsonPayload = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonPayload = data;
        },
      };

      await protect(req, res, () => {});
      assert.strictEqual(statusCode, 401);
      assert.strictEqual(jsonPayload.success, false);
      assert.match(jsonPayload.message, /token invalid or expired/i);
    });
  });

  describe('authMiddleware: authorize(...roles)', () => {
    it('should call next() if user role is included in authorized roles', () => {
      const middleware = authorize('official', 'admin');
      const req = { user: { role: 'admin' } };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      middleware(req, {}, next);
      assert.strictEqual(nextCalled, true);
    });

    it('should return 403 Forbidden if user role is not authorized', () => {
      const middleware = authorize('official', 'admin');
      const req = { user: { role: 'citizen' } };
      let statusCode = null;
      let jsonPayload = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonPayload = data;
        },
      };

      middleware(req, res, () => {});
      assert.strictEqual(statusCode, 403);
      assert.strictEqual(jsonPayload.success, false);
      assert.match(jsonPayload.message, /not authorized/i);
    });
  });

  describe('errorMiddleware: notFound & errorHandler', () => {
    it('notFound should forward a 404 Error to next()', () => {
      const req = { originalUrl: '/api/unknown' };
      let passedError = null;
      let statusCode = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
      };

      notFound(req, res, (err) => {
        passedError = err;
      });

      assert.strictEqual(statusCode, 404);
      assert.ok(passedError);
      assert.match(passedError.message, /Not Found - \/api\/unknown/);
    });

    it('errorHandler should handle Multer LIMIT_FILE_SIZE with 30MB advisory', () => {
      const multerErr = new Error('File too large');
      multerErr.name = 'MulterError';
      multerErr.code = 'LIMIT_FILE_SIZE';

      let statusCode = null;
      let jsonPayload = null;
      const res = {
        statusCode: 200,
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonPayload = data;
        },
      };

      errorHandler(multerErr, {}, res, () => {});
      assert.strictEqual(statusCode, 400);
      assert.match(jsonPayload.message, /30MB/i);
    });

    it('errorHandler should handle Mongoose CastError for invalid ObjectId', () => {
      const castErr = new Error('Cast to ObjectId failed');
      castErr.name = 'CastError';
      castErr.kind = 'ObjectId';

      let statusCode = null;
      let jsonPayload = null;
      const res = {
        statusCode: 200,
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonPayload = data;
        },
      };

      errorHandler(castErr, {}, res, () => {});
      assert.strictEqual(statusCode, 404);
      assert.match(jsonPayload.message, /Resource not found/i);
    });
  });
});
