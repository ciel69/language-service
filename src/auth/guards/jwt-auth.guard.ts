// src/auth/guards/jwt-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwks') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    this.logger.log(
      `JWT Auth Guard checking request. Auth header: ${authHeader ? 'present' : 'missing'}`,
    );

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    this.logger.log(
      `JWT Handle Request. Error: ${!!err}, User: ${!!user}, Info: ${info?.name || 'none'}`,
    );

    if (err || !user) {
      this.logger.error(
        'JWT authentication failed:',
        err || 'No user found',
        info,
      );
      throw err || new UnauthorizedException('Invalid or expired token');
    }

    return user;
  }
}
