import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission, Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { DelinquencyService } from '../scheduler/delinquency.service';
import { ContractsService } from '../contracts/contracts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.AGENT)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private delinquencyService: DelinquencyService,
    private contractsService: ContractsService,
  ) {}

  @RequirePermission(Permission.VIEW_DASHBOARD)
  @Get('kpis')
  kpis() {
    return this.dashboardService.kpis();
  }

  @RequirePermission(Permission.MANAGE_DELINQUENCY)
  @Get('delinquency')
  delinquency(@Query('month') month: string, @Query('year') year: string) {
    const now = new Date();
    return this.dashboardService.delinquencyReport(
      Number(month) || now.getMonth() + 1,
      Number(year) || now.getFullYear(),
    );
  }

  @RequirePermission(Permission.VIEW_DASHBOARD)
  @Get('revenue-series')
  revenueSeries(@Query('year') year: string) {
    return this.dashboardService.monthlyRevenueSeries(Number(year) || new Date().getFullYear());
  }

  @RequirePermission(Permission.MANAGE_DELINQUENCY)
  @Post('run-delinquency-check')
  runCheck() {
    return this.delinquencyService.runCheck();
  }

  @Roles(Role.ADMIN)
  @Post('reapply-grace-period')
  async reapplyGracePeriod() {
    const { updated } = await this.contractsService.reapplyGracePeriodToExisting();
    const delinquency = await this.delinquencyService.runCheck();
    return { contractsUpdated: updated, delinquency };
  }
}
