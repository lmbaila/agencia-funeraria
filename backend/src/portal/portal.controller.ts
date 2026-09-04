import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientsService } from '../clients/clients.service';
import { DependentsService } from '../dependents/dependents.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateDependentDto } from '../dependents/dto/create-dependent.dto';
import { UpdateDependentDto } from '../dependents/dto/update-dependent.dto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Portal do Cliente: endpoints self-service acessíveis apenas pelo próprio Titular
 * autenticado (identificados sempre pelo clientId embutido no JWT, nunca por parâmetro
 * de rota, para impedir o acesso a dados de outros clientes).
 */
@ApiTags('portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENT)
@Controller('portal')
export class PortalController {
  constructor(
    private clientsService: ClientsService,
    private dependentsService: DependentsService,
    private paymentsService: PaymentsService,
    private prisma: PrismaService,
  ) {}

  @Get('overview')
  async overview(@CurrentUser('userId') userId: string) {
    return this.clientsService.findByUserId(userId);
  }

  @Get('dependents')
  async listDependents(@CurrentUser('clientId') clientId: string) {
    return this.dependentsService.findAllForClient(clientId);
  }

  @Post('dependents')
  async addDependent(@CurrentUser('clientId') clientId: string, @Body() dto: CreateDependentDto) {
    return this.dependentsService.create(clientId, dto, 'CLIENTE (auto-serviço)');
  }

  @Patch('dependents/:id')
  async updateDependent(
    @CurrentUser('clientId') clientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDependentDto,
  ) {
    return this.dependentsService.update(clientId, id, dto, true, 'CLIENTE (auto-serviço)');
  }

  @Patch('dependents/:id/remove')
  async removeDependent(@CurrentUser('clientId') clientId: string, @Param('id') id: string) {
    return this.dependentsService.remove(clientId, id, true, 'CLIENTE (auto-serviço)');
  }

  @Get('payments/:contractId')
  async payments(@CurrentUser('clientId') clientId: string, @Param('contractId') contractId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.clientId !== clientId) {
      throw new ForbiddenException('Este contrato não pertence ao utilizador autenticado');
    }
    return this.paymentsService.listForContract(contractId);
  }
}
