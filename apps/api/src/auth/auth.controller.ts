import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { CSRF_COOKIE, SESSION_COOKIE, SESSION_TTL_MS } from './auth.constants';
import { AuthenticatedRequest, SessionAuthGuard } from './guards/session-auth.guard';
import { CsrfGuard } from './guards/csrf.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(body.email, body.password);
    const secure = process.env.NODE_ENV === 'production';
    response.cookie(SESSION_COOKIE, result.sessionToken, { httpOnly: true, secure, sameSite: 'lax', maxAge: SESSION_TTL_MS, path: '/' });
    response.cookie(CSRF_COOKIE, result.csrfToken, { httpOnly: false, secure, sameSite: 'lax', maxAge: SESSION_TTL_MS, path: '/' });
    return { user: result.user };
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard, CsrfGuard)
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    if (request.sessionToken) await this.authService.revoke(request.sessionToken);
    response.clearCookie(SESSION_COOKIE, { path: '/' });
    response.clearCookie(CSRF_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }
}
