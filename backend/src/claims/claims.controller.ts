import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Permission, Role } from '@prisma/client';
import { resolveDocumentPath } from '../common/utils/upload.util';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ConfirmClaimDto } from './dto/confirm-claim.dto';
import { RejectClaimDto } from './dto/reject-claim.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('claims')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.AGENT)
@Controller()
export class ClaimsController {
  constructor(private claimsService: ClaimsService) {}

  /** Consultar o histórico de sinistros acompanha a permissão de gerir clientes. */
  @RequirePermission(Permission.MANAGE_CLIENTS)
  @Get('contracts/:id/claims')
  findAllForContract(@Param('id') id: string) {
    return this.claimsService.findAllForContract(id);
  }

  /** Ver a certidão de óbito anexada acompanha a mesma permissão de consultar o histórico. */
  @RequirePermission(Permission.MANAGE_CLIENTS)
  @Get('claims/:claimId/death-certificate')
  async deathCertificate(@Param('claimId') claimId: string, @Res() res: Response) {
    const { path, mimeType } = await this.claimsService.getDeathCertificateInfo(claimId);
    res.setHeader('Content-Type', mimeType);
    res.sendFile(resolveDocumentPath(path));
  }

  @RequirePermission(Permission.MANAGE_CLAIMS)
  @Post('contracts/:id/claims')
  create(@Param('id') id: string, @Body() dto: CreateClaimDto, @CurrentUser('identifier') identifier: string) {
    return this.claimsService.create(id, dto, identifier);
  }

  /** Confirma presencialmente um pedido de comunicação de óbito submetido online. */
  @RequirePermission(Permission.MANAGE_CLAIMS)
  @Patch('claims/:claimId/confirm')
  confirm(@Param('claimId') claimId: string, @Body() dto: ConfirmClaimDto, @CurrentUser('identifier') identifier: string) {
    return this.claimsService.confirm(claimId, identifier, dto.deathCertificatePath, dto.deathCertificateMimeType);
  }

  /** Rejeita um pedido de comunicação de óbito submetido online (ex: dados não confirmam presencialmente). */
  @RequirePermission(Permission.MANAGE_CLAIMS)
  @Patch('claims/:claimId/reject')
  reject(
    @Param('claimId') claimId: string,
    @Body() dto: RejectClaimDto,
    @CurrentUser('identifier') identifier: string,
  ) {
    return this.claimsService.reject(claimId, dto.reason, identifier);
  }
}
