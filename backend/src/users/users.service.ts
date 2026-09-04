import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { generateTemporaryPassword } from '../common/utils/codes.util';

const STAFF_SELECT = {
  id: true,
  identifier: true,
  firstName: true,
  lastName: true,
  role: true,
  permissions: true,
  active: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
};

const IDENTIFIER_PATTERN = /^[a-zA-Z0-9._-]+$/;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Verificação em tempo real usada pelos formulários de registo/edição, enquanto o
   * identificador é gerado a partir do nome — confirma formato válido e que ainda está livre.
   * `excludeId` permite que um utilizador ao editar-se mantenha o seu próprio identificador. */
  async checkIdentifierAvailable(identifier: string, excludeId?: string) {
    if (!identifier || identifier.length < 3 || !IDENTIFIER_PATTERN.test(identifier)) {
      return { valid: false, available: false };
    }
    const existing = await this.prisma.user.findUnique({ where: { identifier } });
    return { valid: true, available: !existing || existing.id === excludeId };
  }

  /** Administradores e agentes — os dois papéis geridos nesta página, distinguidos pelo campo `role`. */
  async findAllStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'AGENT'] } },
      select: STAFF_SELECT,
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    });
  }

  private async assertIdentifierAvailable(identifier: string) {
    const existing = await this.prisma.user.findUnique({ where: { identifier } });
    if (existing) {
      throw new BadRequestException('Já existe um utilizador com este identificador.');
    }
  }

  async createAgent(dto: CreateAgentDto) {
    await this.assertIdentifierAvailable(dto.identifier);

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        identifier: dto.identifier,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        passwordHash,
        role: 'AGENT',
        permissions: dto.permissions ?? [],
        mustChangePassword: true,
      },
      select: STAFF_SELECT,
    });

    return { user, temporaryPassword };
  }

  /** Cria um novo administrador — acesso total ao sistema, por isso confirmado com password no
   * frontend antes de chegar aqui. Não tem `permissions`: o ADMIN ignora sempre esse campo. */
  async createAdmin(dto: CreateAdminDto) {
    await this.assertIdentifierAvailable(dto.identifier);

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        identifier: dto.identifier,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        passwordHash,
        role: 'ADMIN',
        mustChangePassword: true,
      },
      select: STAFF_SELECT,
    });

    return { user, temporaryPassword };
  }

  private async findStaffOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || (user.role !== 'AGENT' && user.role !== 'ADMIN')) {
      throw new NotFoundException('Utilizador não encontrado.');
    }
    return user;
  }

  async updateStaff(id: string, dto: UpdateStaffDto) {
    const target = await this.findStaffOrThrow(id);

    if (dto.identifier && dto.identifier !== target.identifier) {
      await this.assertIdentifierAvailable(dto.identifier);
    }

    if (target.role === 'ADMIN' && dto.active === false) {
      const otherActiveAdmins = await this.prisma.user.count({
        where: { role: 'ADMIN', active: true, id: { not: id } },
      });
      if (otherActiveAdmins === 0) {
        throw new BadRequestException('Não é possível desactivar o último administrador activo.');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        identifier: dto.identifier,
        // Um administrador tem sempre acesso total — não faz sentido guardar permissões para ele.
        permissions: target.role === 'AGENT' ? dto.permissions : undefined,
        active: dto.active,
      },
      select: STAFF_SELECT,
    });
  }

  async resetPassword(id: string) {
    await this.findStaffOrThrow(id);
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    });
    return { temporaryPassword };
  }
}
