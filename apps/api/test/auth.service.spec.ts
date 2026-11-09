import * as bcrypt from 'bcryptjs';
import { UserStatus } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';
import { hashToken } from '../src/auth/auth.utils';

describe('AuthService', () => {
  const user = {
    id: 'user-1',
    operatorId: 'operator-1',
    name: 'Owner',
    email: 'owner@example.com',
    role: 'OWNER',
    passwordHash: bcrypt.hashSync('correct-password', 4),
    status: UserStatus.ACTIVE,
  };

  it('creates an opaque session for valid credentials', async () => {
    const sessionCreate = jest.fn().mockResolvedValue({ id: 'session-1' });
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(user) },
      session: { create: sessionCreate },
    } as any;
    const service = new AuthService(prisma);

    const result = await service.login('OWNER@EXAMPLE.COM', 'correct-password');

    expect(result.user).toEqual({
      id: 'user-1',
      operatorId: 'operator-1',
      name: 'Owner',
      email: 'owner@example.com',
      role: 'OWNER',
      sessionId: 'session-1',
    });
    expect(result.sessionToken).toHaveLength(64);
    expect(result.csrfToken).toHaveLength(64);
    expect(sessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        operatorId: 'operator-1',
        tokenHash: hashToken(result.sessionToken),
        csrfTokenHash: hashToken(result.csrfToken),
      }),
    });
  });

  it('rejects invalid credentials without creating a session', async () => {
    const sessionCreate = jest.fn();
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(user) },
      session: { create: sessionCreate },
    } as any;
    const service = new AuthService(prisma);

    await expect(service.login('owner@example.com', 'wrong-password')).rejects.toThrow('Invalid credentials');
    expect(sessionCreate).not.toHaveBeenCalled();
  });
});
