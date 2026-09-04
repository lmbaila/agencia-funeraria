import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

function toResponse(s: {
  lateFeeMonthlyRate: any;
  suspensionThresholdInstallments: number;
  suspensionRegularizationDays: number;
  gracePeriodMonths: number;
  postDeathClaimWindowMonths: number;
  updatedAt: Date;
  updatedById: string | null;
}) {
  return {
    lateFeeMonthlyRatePercent: Number(s.lateFeeMonthlyRate) * 100,
    suspensionThresholdInstallments: s.suspensionThresholdInstallments,
    suspensionRegularizationDays: s.suspensionRegularizationDays,
    gracePeriodMonths: s.gracePeriodMonths,
    postDeathClaimWindowMonths: s.postDeathClaimWindowMonths,
    updatedAt: s.updatedAt,
    updatedById: s.updatedById,
  };
}

@ApiTags('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.AGENT)
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  async get() {
    return toResponse(await this.settingsService.get());
  }

  @Roles(Role.ADMIN)
  @Patch()
  async update(@Body() dto: UpdateSettingsDto, @CurrentUser('identifier') identifier: string) {
    const changes: {
      lateFeeMonthlyRate?: number;
      suspensionThresholdInstallments?: number;
      suspensionRegularizationDays?: number;
      gracePeriodMonths?: number;
      postDeathClaimWindowMonths?: number;
    } = {};
    if (dto.lateFeeMonthlyRatePercent !== undefined) changes.lateFeeMonthlyRate = dto.lateFeeMonthlyRatePercent / 100;
    if (dto.suspensionThresholdInstallments !== undefined) changes.suspensionThresholdInstallments = dto.suspensionThresholdInstallments;
    if (dto.suspensionRegularizationDays !== undefined) changes.suspensionRegularizationDays = dto.suspensionRegularizationDays;
    if (dto.gracePeriodMonths !== undefined) changes.gracePeriodMonths = dto.gracePeriodMonths;
    if (dto.postDeathClaimWindowMonths !== undefined) changes.postDeathClaimWindowMonths = dto.postDeathClaimWindowMonths;

    return toResponse(await this.settingsService.update(changes, identifier));
  }
}
