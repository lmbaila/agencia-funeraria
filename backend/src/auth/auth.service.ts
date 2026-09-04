import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { identifier: dto.identifier },
      include: { client: { include: { contracts: { include: { plan: true } } } } },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.signToken(user.id, user.identifier, user.role);

    return {
      accessToken: token,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        identifier: user.identifier,
        role: user.role,
        permissions: user.permissions,
        client: user.client
          ? {
              id: user.client.id,
              fullName: user.client.fullName,
              status: user.client.status,
              activeContract:
                user.client.contracts.find((c) => c.status !== 'TERMINATED' && c.status !== 'CANCELLED')
                  ?.id ?? null,
            }
          : null,
      },
    };
  }

  async verifyPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) throw new BadRequestException('Password incorrecta');

    return { valid: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const matches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!matches) throw new BadRequestException('Password actual incorrecta');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    return { message: 'Password alterada com sucesso' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        client: {
          include: {
            dependents: { where: { active: true } },
            contracts: { include: { plan: true }, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private signToken(userId: string, identifier: string, role: string) {
    return this.jwt.sign({ sub: userId, identifier, role });
  }
}
