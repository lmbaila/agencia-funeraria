import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Permission } from '@prisma/client';

export interface AuthUser {
  userId: string;
  identifier: string;
  role: 'ADMIN' | 'AGENT' | 'CLIENT';
  clientId?: string;
  permissions?: Permission[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return data ? user?.[data] : user;
  },
);
