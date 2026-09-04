import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission, Role } from '@prisma/client';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { TerminateContractDto } from './dto/terminate-contract.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('contracts')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.AGENT)
@RequirePermission(Permission.MANAGE_CLIENTS)
@Controller('contracts')
export class ContractsController {
  constructor(
    private contractsService: ContractsService,
    private prisma: PrismaService,
  ) {}

  @Get()
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.contractsService.findAll({ status, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.contractsService.createContract(this.prisma, dto);
  }

  @Post(':id/membership-fee/confirm')
  confirmMembershipFee(@Param('id') id: string) {
    return this.contractsService.payMembershipFee(id);
  }

  @Patch(':id/extend')
  @RequirePermission(Permission.EXTEND_CONTRACTS)
  extend(
    @Param('id') id: string,
    @Body('additionalMonths') additionalMonths: number,
    @CurrentUser('identifier') identifier: string,
  ) {
    return this.contractsService.extendDuration(id, Number(additionalMonths), identifier);
  }

  @Patch(':id/terminate')
  @RequirePermission(Permission.TERMINATE_CONTRACTS)
  terminate(
    @Param('id') id: string,
    @Body() dto: TerminateContractDto,
    @CurrentUser('identifier') identifier: string,
  ) {
    return this.contractsService.terminateContract(id, dto.reason, identifier);
  }

  /** Reverte uma suspensão/rescisão automática ou manual — acção sensível, reservada ao administrador. */
  @Roles(Role.ADMIN)
  @Post(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.contractsService.reactivateContract(id);
  }
}
