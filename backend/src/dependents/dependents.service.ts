import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDependentDto } from './dto/create-dependent.dto';
import { UpdateDependentDto } from './dto/update-dependent.dto';
import { LIMITED_RELATIONSHIPS } from '../common/utils/dependent-relationships.util';
import { assertValidDependentBirthDate } from '../common/utils/dependent-validation.util';
import { ContractsService } from '../contracts/contracts.service';

/** Prazo dentro do qual o próprio cliente pode editar/remover um dependente que registou. */
const CLIENT_EDIT_WINDOW_HOURS = 24;
const CLIENT_EDIT_WINDOW_MESSAGE =
  `Já passaram mais de ${CLIENT_EDIT_WINDOW_HOURS} horas desde o registo deste dependente. ` +
  'Para o alterar ou remover agora, contacte um agente da agência.';

@Injectable()
export class DependentsService {
  constructor(
    private prisma: PrismaService,
    private contractsService: ContractsService,
  ) {}

  findAllForClient(clientId: string) {
    return this.prisma.dependent.findMany({
      where: { clientId, active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(clientId: string, dto: CreateDependentDto, createdBy?: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Cliente não encontrado');

    const contract = await this.prisma.contract.findFirst({ where: { clientId }, orderBy: { createdAt: 'desc' } });
    this.assertContractAllowsDependentChanges(contract);

    await this.assertRelationshipAvailable(clientId, dto.relationship);
    this.assertBirthDateProvidedWhenRequired(dto.relationship, dto.birthDate);
    if (dto.birthDate && client.birthDate) {
      assertValidDependentBirthDate(dto.relationship, new Date(dto.birthDate), client.birthDate);
    }

    const fullName = `${dto.firstName.trim()} ${dto.lastName.trim()}`.trim();

    const dependent = await this.prisma.dependent.create({
      data: {
        clientId,
        fullName,
        relationship: dto.relationship,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });

    await this.logAddendum(clientId, 'INCLUDE_DEPENDENT', `Inclusão de beneficiário: ${fullName} (${dto.relationship})`, createdBy);
    if (contract) await this.contractsService.recalculateInstallmentAmount(contract.id);

    return dependent;
  }

  async update(clientId: string, dependentId: string, dto: UpdateDependentDto, enforceEditWindow: boolean, createdBy?: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Cliente não encontrado');

    const dependent = await this.prisma.dependent.findFirst({ where: { id: dependentId, clientId, active: true } });
    if (!dependent) throw new NotFoundException('Dependente não encontrado');

    if (enforceEditWindow) this.assertWithinEditWindow(dependent.createdAt);

    await this.assertRelationshipAvailable(clientId, dto.relationship, dependentId);
    this.assertBirthDateProvidedWhenRequired(dto.relationship, dto.birthDate);
    if (dto.birthDate && client.birthDate) {
      assertValidDependentBirthDate(dto.relationship, new Date(dto.birthDate), client.birthDate);
    }

    const fullName = `${dto.firstName.trim()} ${dto.lastName.trim()}`.trim();

    const updated = await this.prisma.dependent.update({
      where: { id: dependentId },
      data: {
        fullName,
        relationship: dto.relationship,
        documentType: dto.documentType ?? null,
        documentNumber: dto.documentNumber ?? null,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      },
    });

    await this.logAddendum(clientId, 'OTHER', `Alteração de beneficiário: ${fullName} (${dto.relationship})`, createdBy);

    return updated;
  }

  async remove(clientId: string, dependentId: string, enforceEditWindow: boolean, createdBy?: string) {
    const dependent = await this.prisma.dependent.findFirst({
      where: { id: dependentId, clientId },
    });
    if (!dependent) throw new NotFoundException('Dependente não encontrado');

    if (enforceEditWindow) this.assertWithinEditWindow(dependent.createdAt);

    await this.prisma.dependent.update({
      where: { id: dependentId },
      data: { active: false, removedAt: new Date() },
    });

    await this.logAddendum(clientId, 'EXCLUDE_DEPENDENT', `Exclusão de beneficiário: ${dependent.fullName}`, createdBy);

    const contract = await this.prisma.contract.findFirst({ where: { clientId }, orderBy: { createdAt: 'desc' } });
    if (contract) await this.contractsService.recalculateInstallmentAmount(contract.id);

    return { message: 'Dependente removido' };
  }

  private assertContractAllowsDependentChanges(contract: { status: string } | null) {
    if (!contract) return;
    if (contract.status === 'SUSPENDED') {
      throw new BadRequestException(
        'O contrato está suspenso por incumprimento de pagamentos. Não é possível registar novos dependentes enquanto a suspensão não for removida por um administrador.',
      );
    }
    if (contract.status !== 'ACTIVE') {
      throw new BadRequestException('Não é possível registar dependentes num contrato que não está activo.');
    }
  }

  private assertWithinEditWindow(createdAt: Date) {
    const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > CLIENT_EDIT_WINDOW_HOURS) {
      throw new ForbiddenException(CLIENT_EDIT_WINDOW_MESSAGE);
    }
  }

  private async assertRelationshipAvailable(clientId: string, relationship: string, excludeDependentId?: string) {
    if (!LIMITED_RELATIONSHIPS.includes(relationship)) return;
    const alreadyExists = await this.prisma.dependent.findFirst({
      where: {
        clientId,
        active: true,
        relationship,
        ...(excludeDependentId ? { id: { not: excludeDependentId } } : {}),
      },
    });
    if (alreadyExists) {
      throw new BadRequestException(
        `Este cliente já tem um dependente registado como "${relationship}". Não é possível registar mais do que um(a).`,
      );
    }
  }

  private assertBirthDateProvidedWhenRequired(relationship: string, birthDate?: string) {
    if (!birthDate && (relationship === 'Pai' || relationship === 'Mãe' || relationship === 'Cônjuge')) {
      throw new BadRequestException(`É necessário indicar a data de nascimento para registar um(a) "${relationship}".`);
    }
  }

  private async logAddendum(clientId: string, type: 'INCLUDE_DEPENDENT' | 'EXCLUDE_DEPENDENT' | 'OTHER', description: string, createdBy?: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { clientId, status: { in: ['ACTIVE', 'SUSPENDED'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!contract) return;
    await this.prisma.addendum.create({ data: { contractId: contract.id, type, description, createdBy } });
  }
}
