import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission, Role } from '@prisma/client';
import { PaymentLinksService } from './payment-links.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('payment-links')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.AGENT)
@RequirePermission(Permission.MANAGE_PAYMENTS)
@Controller('payment-links')
export class PaymentLinksController {
  constructor(private paymentLinksService: PaymentLinksService) {}

  @Post()
  create(@Body() dto: CreatePaymentLinkDto, @CurrentUser('identifier') identifier: string) {
    return this.paymentLinksService.create(dto, identifier);
  }
}
