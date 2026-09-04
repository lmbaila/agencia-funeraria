import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContractsService } from '../contracts/contracts.service';
import { DelinquencyService } from '../scheduler/delinquency.service';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ContractsService)) private contractsService: ContractsService,
    @Inject(forwardRef(() => DelinquencyService)) private delinquencyService: DelinquencyService,
  ) {}

  /** Devolve a linha única de definições, criando-a com os valores por omissão se não existir. */
  async get() {
    const settings = await this.prisma.systemSettings.findUnique({ where: { id: 1 } });
    return settings ?? this.prisma.systemSettings.create({ data: { id: 1 } });
  }

  /**
   * Actualiza as definições e reaplica-as de imediato aos clientes e contratos existentes
   * (fim de carência, atrasos, suspensões e rescisões), para que o estado de cada cliente
   * reflicta sempre as regras em vigor, sem esperar pela verificação diária agendada.
   */
  async update(
    changes: {
      lateFeeMonthlyRate?: number;
      suspensionThresholdInstallments?: number;
      suspensionRegularizationDays?: number;
      gracePeriodMonths?: number;
      postDeathClaimWindowMonths?: number;
    },
    updatedById?: string,
  ) {
    const settings = await this.prisma.systemSettings.upsert({
      where: { id: 1 },
      update: { ...changes, updatedById },
      create: { id: 1, ...changes, updatedById },
    });

    await this.contractsService.reapplyGracePeriodToExisting();
    await this.delinquencyService.runCheck();

    return settings;
  }
}
