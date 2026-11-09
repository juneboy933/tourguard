import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { SESSION_COOKIE } from '../auth.constants';
import { AuthService, AuthenticatedUser } from '../auth.service';

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser; sessionToken?: string };

function readCookie(request: Request, name: string): string | undefined {
  const raw = request.headers.cookie ?? '';
  const entry = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionToken = readCookie(request, SESSION_COOKIE);
    if (!sessionToken) throw new UnauthorizedException();
    const user = await this.authService.authenticate(sessionToken);
    if (!user) throw new UnauthorizedException();
    request.user = user;
    request.sessionToken = sessionToken;
    return true;
  }
}

export { readCookie };
