import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ContractsService } from '../contracts/contracts.service';
import { CreateClientDto } from './dto/create-client.dto';
import { buildClientCode, generateTemporaryPassword } from '../common/utils/codes.util';
import { calculateAge } from '../common/utils/date.util';
import { LIMITED_RELATIONSHIPS } from '../common/utils/dependent-relationships.util';
import { assertValidDependentBirthDate } from '../common/utils/dependent-validation.util';

const MAX_ADHESION_AGE = 65;

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private contractsService: ContractsService,
  ) {}

  /**
   * Regista um novo Titular/Contratante e o respectivo contrato inicial.
   * Usado tanto pela adesão online (Landing Page) como pelo registo presencial no balcão.
   * Retorna as credenciais geradas (identificador + password temporária).
   */
  async registerClientWithContract(
    dto: CreateClientDto,
    channel: 'ONLINE' | 'AGENCY',
    registeredById?: string,
  ) {
    const birthDate = new Date(dto.birthDate);
    const age = calculateAge(birthDate);
    if (age > MAX_ADHESION_AGE) {
      throw new BadRequestException(
        `O limite de idade para adesão a um novo plano é de ${MAX_ADHESION_AGE} anos completos. Idade informada: ${age}.`,
      );
    }

    const existingDocument = await this.prisma.client.findFirst({
      where: { documentNumber: { equals: dto.documentNumber.trim(), mode: 'insensitive' } },
    });
    if (existingDocument) {
      throw new BadRequestException('Já existe um cliente registado com este número de documento (BI/Passaporte)');
    }

    const existingPhone = await this.prisma.client.findFirst({
      where: { phone: dto.phone.trim() },
    });
    if (existingPhone) {
      throw new BadRequestException('Já existe um cliente registado com este número de telemóvel');
    }

    const existingIdentifier = await this.prisma.user.findUnique({ where: { identifier: dto.identifier.trim() } });
    if (existingIdentifier) {
      throw new BadRequestException('Este identificador de acesso já está em uso. Escolha outro.');
    }

    if (dto.dependents?.length) {
      const seen = new Set<string>();
      for (const dep of dto.dependents) {
        if (LIMITED_RELATIONSHIPS.includes(dep.relationship)) {
          if (seen.has(dep.relationship)) {
            throw new BadRequestException(
              `Não é possível registar mais do que um(a) dependente como "${dep.relationship}".`,
            );
          }
          seen.add(dep.relationship);
        }

        if (!dep.birthDate && (dep.relationship === 'Pai' || dep.relationship === 'Mãe' || dep.relationship === 'Cônjuge')) {
          throw new BadRequestException(`É necessário indicar a data de nascimento para registar um(a) "${dep.relationship}".`);
        }
        if (dep.birthDate) {
          assertValidDependentBirthDate(dep.relationship, new Date(dep.birthDate), birthDate);
        }
      }
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.active) throw new NotFoundException('Plano seleccionado não encontrado');

    const year = new Date().getFullYear();
    const clientsThisYear = await this.prisma.client.count({
      where: { clientCode: { startsWith: `AF-${year}-` } },
    });
    const clientCode = buildClientCode(year, clientsThisYear + 1);

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          identifier: dto.identifier.trim(),
          passwordHash,
          role: 'CLIENT',
          mustChangePassword: true,
        },
      });

      const firstName = dto.firstName.trim();
      const lastName = dto.lastName.trim();

      const client = await tx.client.create({
        data: {
          userId: user.id,
          clientCode,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim(),
          nationality: dto.nationality,
          placeOfBirth: dto.placeOfBirth,
          maritalStatus: dto.maritalStatus,
          documentType: dto.documentType ?? 'BI',
          documentNumber: dto.documentNumber,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          birthDate,
          documentImagePath: dto.documentImagePath,
          documentImageMimeType: dto.documentImageMimeType,
          phone: dto.phone,
          alternativePhone: dto.alternativePhone,
          province: dto.province,
          district: dto.district,
          neighborhood: dto.neighborhood,
          addressLine: dto.addressLine,
          block: dto.block,
          houseNumber: dto.houseNumber,
          status: 'GRACE_PERIOD',
          registeredByChannel: channel,
          registeredById,
        },
      });

      if (dto.dependents?.length) {
        await tx.dependent.createMany({
          data: dto.dependents.map((d) => ({
            clientId: client.id,
            fullName: `${d.firstName.trim()} ${d.lastName.trim()}`.trim(),
            relationship: d.relationship,
            documentType: d.documentType,
            documentNumber: d.documentNumber,
            birthDate: d.birthDate ? new Date(d.birthDate) : undefined,
          })),
        });
      }

      const contract = await this.contractsService.createContract(tx, {
        clientId: client.id,
        planId: dto.planId,
        paymentFrequency: dto.paymentFrequency,
        durationMonths: dto.durationMonths,
      });

      return { user, client, contract };
    });

    return {
      credentials: { identifier: dto.identifier.trim(), temporaryPassword },
      client: result.client,
      contract: result.contract,
      membershipFeeAmount: result.contract.membershipFeeAmount,
    };
  }

  /** Verificação em tempo real usada pelo formulário de adesão, antes de submeter o registo. */
  async checkAvailability(documentNumber?: string, phone?: string) {
    const [documentNumberTaken, phoneTaken] = await Promise.all([
      documentNumber?.trim()
        ? this.prisma.client
            .findFirst({ where: { documentNumber: { equals: documentNumber.trim(), mode: 'insensitive' } } })
            .then((c) => !!c)
        : Promise.resolve(false),
      phone?.trim()
        ? this.prisma.client.findFirst({ where: { phone: phone.trim() } }).then((c) => !!c)
        : Promise.resolve(false),
    ]);
    return { documentNumberTaken, phoneTaken };
  }

  /** Verificação em tempo real do identificador de acesso sugerido pelo formulário de adesão
   * (nome + apelido, com sufixo do telemóvel em caso de colisão) — sempre confirmada aqui,
   * já que o identificador é único entre todos os utilizadores do sistema, não só clientes. */
  async checkIdentifierAvailable(identifier: string) {
    const value = identifier?.trim() ?? '';
    if (value.length < 3 || !/^[a-zA-Z0-9._-]+$/.test(value)) {
      return { valid: false, available: false };
    }
    const existing = await this.prisma.user.findUnique({ where: { identifier: value } });
    return { valid: true, available: !existing };
  }

  async findAll(search?: string, status?: string) {
    return this.prisma.client.findMany({
      where: {
        status: status ? (status as any) : undefined,
        OR: search
          ? [
              { fullName: { contains: search, mode: 'insensitive' } },
              { clientCode: { contains: search, mode: 'insensitive' } },
              { documentNumber: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        contracts: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        dependents: { where: { active: true } },
        contracts: {
          include: { plan: true, installments: { orderBy: { sequence: 'asc' } }, addendums: true },
          orderBy: { createdAt: 'desc' },
        },
        user: { select: { identifier: true, lastLoginAt: true, active: true } },
      },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  async findByUserId(userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { userId },
      include: {
        dependents: { where: { active: true } },
        contracts: {
          include: { plan: true, installments: { orderBy: { sequence: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  /** Repõe a password do cliente (ex: perdeu o papel com as credenciais) — devolve uma nova temporária. */
  async resetPassword(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Cliente não encontrado');

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    await this.prisma.user.update({
      where: { id: client.userId },
      data: { passwordHash, mustChangePassword: true },
    });

    return { temporaryPassword };
  }

  async getDocumentImageInfo(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      select: { documentImagePath: true, documentImageMimeType: true },
    });
    if (!client?.documentImagePath) {
      throw new NotFoundException('Este cliente não tem um documento de identificação anexado.');
    }
    return { path: client.documentImagePath, mimeType: client.documentImageMimeType ?? 'application/octet-stream' };
  }
}
