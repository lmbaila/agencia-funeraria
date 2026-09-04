import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.plan.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    return plan;
  }

  private async assertNameAvailable(name: string, excludePlanId?: string) {
    const existing = await this.prisma.plan.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' }, ...(excludePlanId ? { id: { not: excludePlanId } } : {}) },
    });
    if (existing) throw new BadRequestException(`Já existe um plano com o identificador "${name}".`);
  }

  async create(dto: CreatePlanDto) {
    await this.assertNameAvailable(dto.name);
    return this.prisma.plan.create({ data: dto });
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);
    if (dto.name) await this.assertNameAvailable(dto.name, id);
    return this.prisma.plan.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.plan.update({ where: { id }, data: { active: false } });
  }

  feeForFrequency(plan: { monthlyFee: any; quarterlyFee: any; semiannualFee: any; annualFee: any }, frequency: string) {
    switch (frequency) {
      case 'MONTHLY':
        return plan.monthlyFee;
      case 'QUARTERLY':
        return plan.quarterlyFee;
      case 'SEMIANNUAL':
        return plan.semiannualFee;
      case 'ANNUAL':
        return plan.annualFee;
      default:
        return plan.monthlyFee;
    }
  }
}
