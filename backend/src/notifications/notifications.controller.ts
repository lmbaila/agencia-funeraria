import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission, Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.AGENT)
@RequirePermission(Permission.MANAGE_DELINQUENCY)
@Controller()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('contracts/:id/notifications')
  findAllForContract(@Param('id') id: string) {
    return this.notificationsService.findAllForContract(id);
  }

  @Post('installments/:id/remind')
  remind(@Param('id') id: string, @CurrentUser('identifier') identifier: string) {
    return this.notificationsService.sendInstallmentReminder(id, identifier);
  }
}
