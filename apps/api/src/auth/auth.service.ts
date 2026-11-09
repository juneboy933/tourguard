import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { SESSION_TTL_MS } from './auth.constants';
import { createOpaqueToken, hashToken } from './auth.utils';

export type AuthenticatedUser = {
  id: string;
  operatorId: string;
  name: string;
  email: string;
  role: string;
  sessionId: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string): Promise<{ sessionToken: string; csrfToken: string; user: AuthenticatedUser }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({ where: { email: normalizedEmail, status: UserStatus.ACTIVE } });
    const valid = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionToken = createOpaqueToken();
    const csrfToken = createOpaqueToken();
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        operatorId: user.operatorId,
        tokenHash: hashToken(sessionToken),
        csrfTokenHash: hashToken(csrfToken),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });

    return { sessionToken, csrfToken, user: this.toAuthenticatedUser(user, session.id) };
  }

  async authenticate(sessionToken: string): Promise<AuthenticatedUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(sessionToken) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== UserStatus.ACTIVE) {
      return null;
    }

    await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    return this.toAuthenticatedUser(session.user, session.id);
  }

  async getSession(sessionToken: string) {
    return this.prisma.session.findUnique({ where: { tokenHash: hashToken(sessionToken) } });
  }

  async revoke(sessionToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: hashToken(sessionToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private toAuthenticatedUser(user: { id: string; operatorId: string; name: string; email: string; role: string }, sessionId: string): AuthenticatedUser {
    return { id: user.id, operatorId: user.operatorId, name: user.name, email: user.email, role: user.role, sessionId };
  }
}
