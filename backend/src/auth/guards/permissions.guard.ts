import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest() as { user: AuthUser };
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role !== 'AGENT') return false;

    return required.some((p) => user.permissions?.includes(p));
  }
}
