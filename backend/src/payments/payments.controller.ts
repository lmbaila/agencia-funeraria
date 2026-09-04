import { Body, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission, Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { InitiateMobileMoneyDto } from './dto/initiate-mobile-money.dto';
import { ManualPaymentDto } from './dto/manual-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('payments')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private prisma: PrismaService,
  ) {}

  private async assertOwnership(contractId: string, user: AuthUser) {
    if (user.role !== Role.CLIENT) return;
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.clientId !== user.clientId) {
      throw new ForbiddenException('Este contrato não pertence ao utilizador autenticado');
    }
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.paymentsService.getStatus(id);
  }

  @Get('contract/:contractId')
  async listForContract(@Param('contractId') contractId: string, @CurrentUser() user: AuthUser) {
    await this.assertOwnership(contractId, user);
    return this.paymentsService.listForContract(contractId);
  }

  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN, Role.AGENT)
  @RequirePermission(Permission.MANAGE_PAYMENTS)
  @Get()
  listAll(@Query('month') month?: string, @Query('status') status?: string) {
    return this.paymentsService.listAll({ month, status });
  }

  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN, Role.AGENT)
  @RequirePermission(Permission.MANAGE_PAYMENTS)
  @Post('manual')
  registerManual(@Body() dto: ManualPaymentDto, @CurrentUser('identifier') identifier: string) {
    return this.paymentsService.registerManualPayment(dto, identifier);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @Post('mobile-money')
  async initiateMobileMoney(@Body() dto: InitiateMobileMoneyDto, @CurrentUser() user: AuthUser) {
    await this.assertOwnership(dto.contractId, user);
    return this.paymentsService.initiateMobileMoney(dto);
  }

  // Cobrança de carteira móvel iniciada pelo agente/admin em nome do cliente
  // (ex: cliente ligou para a agência a pedir para ser cobrado).
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN, Role.AGENT)
  @RequirePermission(Permission.MANAGE_PAYMENTS)
  @Post('mobile-money/staff')
  initiateMobileMoneyStaff(@Body() dto: InitiateMobileMoneyDto) {
    return this.paymentsService.initiateMobileMoney(dto);
  }
}
