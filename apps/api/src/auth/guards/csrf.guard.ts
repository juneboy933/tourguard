import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { CSRF_COOKIE } from '../auth.constants';
import { AuthenticatedRequest, readCookie } from './session-auth.guard';
import { hashToken } from '../auth.utils';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    if (request.path.endsWith('/auth/login')) return true;
    const sessionToken = request.sessionToken;
    const csrfCookie = readCookie(request, CSRF_COOKIE);
    const csrfHeader = request.headers['x-csrf-token'];
    const session = sessionToken ? await this.authService.getSession(sessionToken) : null;
    if (!session || !csrfCookie || typeof csrfHeader !== 'string' || csrfHeader !== csrfCookie || hashToken(csrfCookie) !== session.csrfTokenHash) {
      throw new ForbiddenException('CSRF validation failed');
    }
    return true;
  }
}
