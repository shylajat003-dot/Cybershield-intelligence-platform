import request from 'supertest';
import app from '../app';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import { RiskScoringService } from '../services/riskScoringService';

process.env.NODE_ENV = 'test';

jest.mock('../config/redis', () => ({
  redisClient: { get: jest.fn(), set: jest.fn(), del: jest.fn(), publish: jest.fn() },
  default: { get: jest.fn(), set: jest.fn(), del: jest.fn(), publish: jest.fn() },
}));

describe('Risk Scoring Service', () => {
  it('should return CRITICAL score for CRITICAL severity with high confidence', () => {
    const result = RiskScoringService.calculateRiskScore({ severity: 'CRITICAL', confidence: 95, sourceReliability: 95, recurrenceCount: 3 });
    expect(result.score).toBeGreaterThanOrEqual(76);
    expect(result.riskLevel).toBe('CRITICAL');
  });

  it('should return LOW score for LOW severity with low confidence', () => {
    const result = RiskScoringService.calculateRiskScore({ severity: 'LOW', confidence: 10, sourceReliability: 20, recurrenceCount: 1 });
    expect(result.score).toBeLessThanOrEqual(25);
    expect(result.riskLevel).toBe('LOW');
  });

  it('should normalize score to 0-100 range', () => {
    const result = RiskScoringService.calculateRiskScore({ severity: 'HIGH', confidence: 80, sourceReliability: 90, recurrenceCount: 2 });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('should provide explanation text', () => {
    const result = RiskScoringService.calculateRiskScore({ severity: 'MEDIUM', confidence: 60 });
    expect(result.explanation).toBeTruthy();
    expect(result.explanation.length).toBeGreaterThan(10);
  });
});

describe('Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/auth/login - should reject invalid credentials', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValueOnce(null as any);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalid@test.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login - should authenticate valid user', async () => {
    const hash = await bcrypt.hash('Admin123!', 1); // rounds=1 for test speed
    const mockUserDoc: any = {
      _id: '66d000000000000000000001',
      id: '66d000000000000000000001',
      name: 'Test Admin',
      email: 'admin@test.com',
      password_hash: hash,
      role: 'ADMIN',
      created_at: new Date(),
      toJSON: function() {
        return {
          id: this.id,
          name: this.name,
          email: this.email,
          role: this.role,
          created_at: this.created_at
        };
      }
    };

    jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUserDoc as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin123!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
  }, 15000);

  it('POST /api/auth/register - should validate email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'bad-email', password: 'pass123' });
    expect(res.status).toBe(422);
  });

  it('should reject protected routes without token', async () => {
    const res = await request(app).get('/api/threats');
    expect(res.status).toBe(401);
  });

  it('should reject invalid JWT tokens', async () => {
    const res = await request(app)
      .get('/api/threats')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(403);
  });
});
