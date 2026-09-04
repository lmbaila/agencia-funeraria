import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Gestão de utilizadores internos (administradores e agentes). Exclusivo do ADMIN — a
 * atribuição de permissões e a criação de novos acessos não são, elas próprias, delegáveis.
 */
@ApiTags('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('staff')
  findAllStaff() {
    return this.usersService.findAllStaff();
  }

  @Get('identifier-available')
  checkIdentifierAvailable(@Query('identifier') identifier: string, @Query('excludeId') excludeId?: string) {
    return this.usersService.checkIdentifierAvailable(identifier, excludeId);
  }

  @Post('agents')
  createAgent(@Body() dto: CreateAgentDto) {
    return this.usersService.createAgent(dto);
  }

  @Post('admins')
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.usersService.createAdmin(dto);
  }

  @Patch('staff/:id')
  updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.usersService.updateStaff(id, dto);
  }

  @Post('staff/:id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.usersService.resetPassword(id);
  }
}
