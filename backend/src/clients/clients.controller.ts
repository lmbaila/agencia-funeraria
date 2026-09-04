import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Permission, Role } from '@prisma/client';
import { resolveDocumentPath } from '../common/utils/upload.util';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DependentsService } from '../dependents/dependents.service';
import { CreateDependentDto } from '../dependents/dto/create-dependent.dto';
import { UpdateDependentDto } from '../dependents/dto/update-dependent.dto';

@ApiTags('clients')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.AGENT)
@RequirePermission(Permission.MANAGE_CLIENTS)
@Controller('clients')
export class ClientsController {
  constructor(
    private clientsService: ClientsService,
    private dependentsService: DependentsService,
  ) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('status') status?: string) {
    return this.clientsService.findAll(search, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  // Registo presencial feito pelo agente/administrador no balcão da agência
  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser('identifier') identifier: string) {
    return this.clientsService.registerClientWithContract(dto, 'AGENCY', identifier);
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.clientsService.resetPassword(id);
  }

  @Get(':id/document-image')
  async documentImage(@Param('id') id: string, @Res() res: Response) {
    const { path, mimeType } = await this.clientsService.getDocumentImageInfo(id);
    res.setHeader('Content-Type', mimeType);
    res.sendFile(resolveDocumentPath(path));
  }

  @Get(':id/dependents')
  listDependents(@Param('id') id: string) {
    return this.dependentsService.findAllForClient(id);
  }

  @Post(':id/dependents')
  addDependent(
    @Param('id') id: string,
    @Body() dto: CreateDependentDto,
    @CurrentUser('identifier') identifier: string,
  ) {
    return this.dependentsService.create(id, dto, identifier);
  }

  @Patch(':id/dependents/:dependentId')
  updateDependent(
    @Param('id') id: string,
    @Param('dependentId') dependentId: string,
    @Body() dto: UpdateDependentDto,
    @CurrentUser('identifier') identifier: string,
  ) {
    return this.dependentsService.update(id, dependentId, dto, false, identifier);
  }

  @Patch(':id/dependents/:dependentId/remove')
  @RequirePermission(Permission.DELETE_DEPENDENTS)
  removeDependent(
    @Param('id') id: string,
    @Param('dependentId') dependentId: string,
    @CurrentUser('identifier') identifier: string,
  ) {
    return this.dependentsService.remove(id, dependentId, false, identifier);
  }
}
