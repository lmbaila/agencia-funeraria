import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Claim, ClaimBeneficiaryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContractsService } from '../contracts/contracts.service';
import { SettingsService } from '../settings/settings.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { PublicClaimLookupDto } from './dto/public-claim-lookup.dto';
import { PublicClaimRequestDto } from './dto/public-claim-request.dto';
import { similarity } from '../common/utils/string-similarity.util';
import { addMonths, startOfDay } from '../common/utils/date.util';

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Semelhança mínima aceite entre o nome indicado e o nome real (titular ou dependente). */
const NAME_SIMILARITY_THRESHOLD = 0.6;

@Injectable()
export class ClaimsService {
  constructor(
    private prisma: PrismaService,
    private contractsService: ContractsService,
    private settingsService: SettingsService,
  ) {}

  findAllForContract(contractId: string) {
    return this.prisma.claim.findMany({
      where: { contractId },
      include: { dependent: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id },
      include: { contract: { include: { client: true, plan: true } }, dependent: true },
    });
    if (!claim) throw new NotFoundException('Sinistro não encontrado');
    return claim;
  }

  async getDeathCertificateInfo(claimId: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      select: { deathCertificatePath: true, deathCertificateMimeType: true },
    });
    if (!claim?.deathCertificatePath) {
      throw new NotFoundException('Este sinistro não tem certidão de óbito anexada.');
    }
    return { path: claim.deathCertificatePath, mimeType: claim.deathCertificateMimeType ?? 'application/octet-stream' };
  }

  /**
   * Regista directamente (pelo balcão) o falecimento do titular ou de um dependente coberto,
   * já confirmado — sem passar pelo pedido prévio da página pública. Se for o titular, o
   * contrato passa a FULFILLED e deixa de haver mais cobranças. Se for um dependente, só
   * esse dependente é removido — o contrato e as restantes coberturas continuam normais.
   */
  async create(contractId: string, dto: CreateClaimDto, registeredBy?: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { client: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');

    await this.assertContractEligible(contract);

    const dateOfDeath = new Date(dto.dateOfDeath);
    this.assertValidDateOfDeath(dateOfDeath, contract);

    const { deceasedName, dependent } = await this.resolveBeneficiary(
      contract,
      contract.client,
      dto.beneficiaryType,
      dto.dependentId,
    );
    await this.assertNoDuplicateClaim(contractId, dto.beneficiaryType, dependent?.id);

    if (dto.beneficiaryType === 'CLIENT') {
      const pendingClaims = await this.prisma.claim.count({
        where: { contractId, status: 'REQUESTED' },
      });
      if (pendingClaims > 0) {
        throw new BadRequestException(
          'Existem pedidos de sinistro por tramitar neste contrato. Confirme ou rejeite primeiro os pedidos dos dependentes — registar o sinistro do titular conclui o contrato e impede-os de ser processados depois.',
        );
      }
    }

    const now = new Date();
    const claim = await this.prisma.$transaction(async (tx) => {
      const created = await tx.claim.create({
        data: {
          contractId,
          beneficiaryType: dto.beneficiaryType,
          dependentId: dependent?.id,
          deceasedName,
          dateOfDeath,
          notes: dto.notes,
          deathCertificatePath: dto.deathCertificatePath,
          deathCertificateMimeType: dto.deathCertificateMimeType,
          status: 'REGISTERED',
          source: 'STAFF',
          registeredById: registeredBy,
          confirmedAt: now,
        },
      });

      await this.applyClaimEffects(tx, contract, dto.beneficiaryType, dependent, now);

      await tx.addendum.create({
        data: {
          contractId,
          type: 'OTHER',
          description: `Sinistro registado: falecimento de ${deceasedName}${
            dto.beneficiaryType === 'DEPENDENT' ? ' (dependente)' : ' (titular)'
          }.`,
          createdBy: registeredBy,
        },
      });

      return created;
    });

    return claim;
  }

  /**
   * Passo 1 da comunicação de óbito pública: confirma a identidade de quem contacta a agência
   * (documento + últimos 4 dígitos do telemóvel + nome do titular ou de um dependente) e devolve
   * a lista de pessoas seguras nesse contrato, para a família indicar quem faleceu.
   */
  async lookupPublic(dto: PublicClaimLookupDto) {
    const { client, contract } = await this.verifyIdentityAndContract(dto.documentNumber, dto.phoneLast4, dto.name);
    const insuredPersons = await this.buildInsuredList(client, contract.id, contract.status);

    return {
      contractNumber: contract.contractNumber,
      clientName: client.fullName,
      insuredPersons,
    };
  }

  /**
   * Passo 2 da comunicação de óbito pública: regista o(s) pedido(s) como REQUESTED — não altera
   * ainda nenhuma cobertura, contrato ou mensalidade. Isso só acontece quando um agente confirmar
   * o pedido presencialmente (`confirm`). Reverifica a identidade de forma independente do que a
   * página de lookup devolveu, para nunca confiar em dados vindos do cliente sem validação.
   */
  async submitPublicRequest(dto: PublicClaimRequestDto) {
    const { client, contract } = await this.verifyIdentityAndContract(dto.documentNumber, dto.phoneLast4, dto.name);

    const dateOfDeath = new Date(dto.dateOfDeath);
    this.assertValidDateOfDeath(dateOfDeath, contract);

    const uniqueSelections = Array.from(
      new Map(dto.selections.map((s) => [`${s.beneficiaryType}:${s.dependentId ?? ''}`, s])).values(),
    );

    const resolved: { deceasedName: string; dependent: { id: string; fullName: string } | null; beneficiaryType: ClaimBeneficiaryType }[] =
      [];
    for (const selection of uniqueSelections) {
      const { deceasedName, dependent } = await this.resolveBeneficiary(
        contract,
        client,
        selection.beneficiaryType,
        selection.dependentId,
      );
      await this.assertNoDuplicateClaim(contract.id, selection.beneficiaryType, dependent?.id);
      resolved.push({ deceasedName, dependent, beneficiaryType: selection.beneficiaryType });
    }

    const requestBatchId = randomUUID();

    const claims = await this.prisma.$transaction(async (tx) => {
      const created: Claim[] = [];
      for (const r of resolved) {
        created.push(
          await tx.claim.create({
            data: {
              contractId: contract.id,
              beneficiaryType: r.beneficiaryType,
              dependentId: r.dependent?.id,
              deceasedName: r.deceasedName,
              dateOfDeath,
              notes: dto.notes,
              deathCertificatePath: dto.deathCertificatePath,
              deathCertificateMimeType: dto.deathCertificateMimeType,
              status: 'REQUESTED',
              source: 'PUBLIC_REQUEST',
              requestBatchId,
              requesterName: dto.requesterName,
              requesterPhone: dto.requesterPhone,
              requesterRelationship: dto.requesterRelationship,
            },
          }),
        );
      }

      await tx.addendum.create({
        data: {
          contractId: contract.id,
          type: 'OTHER',
          description: `Comunicação de óbito submetida online por ${dto.requesterName} (${dto.requesterRelationship}), referente a: ${resolved
            .map((r) => r.deceasedName)
            .join(', ')}. Aguarda confirmação presencial na agência.`,
        },
      });

      return created;
    });

    return { requestBatchId, claims };
  }

  /** Usado para gerar o comprovativo (PDF público) de um pedido submetido online. */
  async getBatch(requestBatchId: string) {
    const claims = await this.prisma.claim.findMany({
      where: { requestBatchId },
      include: { contract: { include: { client: true, plan: true } }, dependent: true },
      orderBy: { createdAt: 'asc' },
    });
    if (claims.length === 0) throw new NotFoundException('Comprovativo não encontrado.');
    return claims;
  }

  /** Um agente confirma presencialmente um pedido submetido online — só aqui os efeitos reais acontecem. */
  async confirm(claimId: string, staffIdentifier?: string, deathCertificatePath?: string, deathCertificateMimeType?: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: { contract: { include: { client: true } } },
    });
    if (!claim) throw new NotFoundException('Sinistro não encontrado');
    if (claim.status !== 'REQUESTED') {
      throw new BadRequestException('Este pedido já foi processado e não pode ser confirmado novamente.');
    }

    const { contract } = claim;
    await this.assertContractEligible(contract);

    if (claim.beneficiaryType === 'CLIENT') {
      // Confirmar o sinistro do titular conclui o contrato — se ainda houver sinistros de
      // dependentes por tramitar no mesmo contrato, deixariam de poder ser confirmados depois.
      const pendingDependentClaims = await this.prisma.claim.count({
        where: { contractId: contract.id, status: 'REQUESTED', id: { not: claimId } },
      });
      if (pendingDependentClaims > 0) {
        throw new BadRequestException(
          'Existem outros pedidos de sinistro por tramitar neste contrato. Confirme ou rejeite primeiro os pedidos dos dependentes — confirmar o sinistro do titular conclui o contrato e impede-os de ser processados depois.',
        );
      }
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const dependent = claim.dependentId ? { id: claim.dependentId, fullName: claim.deceasedName } : null;
      await this.applyClaimEffects(tx, contract, claim.beneficiaryType, dependent, now);

      await tx.claim.update({
        where: { id: claimId },
        data: {
          status: 'REGISTERED',
          registeredById: staffIdentifier,
          confirmedAt: now,
          ...(deathCertificatePath ? { deathCertificatePath, deathCertificateMimeType } : {}),
        },
      });

      await tx.addendum.create({
        data: {
          contractId: contract.id,
          type: 'OTHER',
          description: `Sinistro confirmado presencialmente na agência: falecimento de ${claim.deceasedName}${
            claim.beneficiaryType === 'DEPENDENT' ? ' (dependente)' : ' (titular)'
          }.`,
          createdBy: staffIdentifier,
        },
      });
    });

    return this.findOne(claimId);
  }

  /** Um agente rejeita um pedido submetido online (ex: dados não confirmados presencialmente, engano). */
  async reject(claimId: string, reason: string, staffIdentifier?: string) {
    const claim = await this.prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Sinistro não encontrado');
    if (claim.status !== 'REQUESTED') {
      throw new BadRequestException('Este pedido já foi processado e não pode ser rejeitado novamente.');
    }

    await this.prisma.$transaction([
      this.prisma.claim.update({
        where: { id: claimId },
        data: { status: 'REJECTED', rejectedAt: new Date(), rejectedById: staffIdentifier, rejectionReason: reason },
      }),
      this.prisma.addendum.create({
        data: {
          contractId: claim.contractId,
          type: 'OTHER',
          description: `Pedido de comunicação de óbito rejeitado: ${claim.deceasedName}. Motivo: ${reason}`,
          createdBy: staffIdentifier,
        },
      }),
    ]);

    return this.findOne(claimId);
  }

  private async assertContractEligible(contract: {
    id: string;
    status: string;
    membershipFeePaid: boolean;
    gracePeriodEnd: Date | null;
  }) {
    if (contract.status === 'FULFILLED') {
      // O contrato só fica FULFILLED pela confirmação do óbito do titular — nesse caso, ainda é
      // possível comunicar o óbito de um dependente dentro da janela configurada em Definições.
      const titularClaim = await this.prisma.claim.findFirst({
        where: { contractId: contract.id, beneficiaryType: 'CLIENT', status: 'REGISTERED' },
        select: { dateOfDeath: true },
      });
      if (titularClaim) {
        const settings = await this.settingsService.get();
        const deadline = addMonths(titularClaim.dateOfDeath, settings.postDeathClaimWindowMonths);
        if (deadline >= new Date()) return;
        throw new BadRequestException(
          `O prazo de ${settings.postDeathClaimWindowMonths} meses após o falecimento do titular para comunicar o óbito de um dependente já terminou em ${formatDate(deadline)}. Contacte a agência para tratar este caso excepcionalmente.`,
        );
      }
    }
    if (contract.status === 'SUSPENDED') {
      throw new BadRequestException(
        'O contrato está suspenso por incumprimento de pagamentos. Não é possível comunicar um sinistro enquanto a suspensão não for removida por um administrador.',
      );
    }
    if (contract.status !== 'ACTIVE') {
      throw new BadRequestException('Só é possível accionar o seguro para um contrato activo.');
    }
    if (!contract.membershipFeePaid || !contract.gracePeriodEnd || contract.gracePeriodEnd > new Date()) {
      const untilText = contract.gracePeriodEnd ? ` O período de carência termina em ${formatDate(contract.gracePeriodEnd)}.` : '';
      throw new BadRequestException(
        `O contrato ainda está no período de carência. O seguro só pode ser accionado depois de terminar.${untilText}`,
      );
    }
  }

  private assertValidDateOfDeath(dateOfDeath: Date, contract: { startDate: Date }) {
    const now = new Date();
    if (dateOfDeath > now) {
      throw new BadRequestException('A data de falecimento não pode ser uma data futura.');
    }
    if (dateOfDeath < startOfDay(contract.startDate)) {
      throw new BadRequestException('A data de falecimento não pode ser anterior ao início do contrato.');
    }
  }

  private async resolveBeneficiary(
    contract: { clientId: string },
    client: { fullName: string },
    beneficiaryType: ClaimBeneficiaryType,
    dependentId?: string,
  ) {
    if (beneficiaryType === 'CLIENT') {
      return { deceasedName: client.fullName, dependent: null as { id: string; fullName: string } | null };
    }
    if (!dependentId) throw new BadRequestException('Indique qual o dependente falecido.');
    const dependent = await this.prisma.dependent.findFirst({
      where: { id: dependentId, clientId: contract.clientId, active: true },
    });
    if (!dependent) throw new NotFoundException('Dependente não encontrado ou já não está activo.');
    return { deceasedName: dependent.fullName, dependent };
  }

  private async assertNoDuplicateClaim(contractId: string, beneficiaryType: ClaimBeneficiaryType, dependentId?: string) {
    const existing = await this.prisma.claim.findFirst({
      where: {
        contractId,
        status: { in: ['REGISTERED', 'REQUESTED'] },
        beneficiaryType,
        dependentId: beneficiaryType === 'DEPENDENT' ? dependentId : null,
      },
    });
    if (existing) {
      throw new BadRequestException(
        existing.status === 'REGISTERED'
          ? 'Já existe um sinistro registado para este beneficiário.'
          : 'Já existe um pedido de comunicação de óbito pendente de confirmação para este beneficiário.',
      );
    }
  }

  /** Aplica os efeitos reais de um sinistro confirmado — usado tanto no registo directo como na confirmação. */
  private async applyClaimEffects(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    contract: { id: string; clientId: string },
    beneficiaryType: ClaimBeneficiaryType,
    dependent: { id: string } | null,
    now: Date,
  ) {
    if (beneficiaryType === 'CLIENT') {
      // Falecimento do titular: já não há quem pague, nem sentido em continuar a cobrança.
      await tx.installment.updateMany({
        where: { contractId: contract.id, status: { in: ['PENDING', 'LATE'] } },
        data: { status: 'WAIVED' },
      });
      await tx.contract.update({ where: { id: contract.id }, data: { status: 'FULFILLED' } });
      await tx.client.update({ where: { id: contract.clientId }, data: { status: 'DECEASED' } });
    } else if (dependent) {
      await tx.dependent.update({ where: { id: dependent.id }, data: { active: false, removedAt: now } });
      // Óbito do dependente reduz o número de pessoas cobertas: a prestação volta a ajustar-se.
      await this.contractsService.recalculateInstallmentAmount(contract.id, tx);
    }
  }

  /** Confirma documento + últimos 4 dígitos do telemóvel + nome (titular ou dependente) — nunca revela qual campo falhou. */
  private async verifyIdentityAndContract(documentNumber: string, phoneLast4: string, name: string) {
    const client = await this.prisma.client.findFirst({
      where: { documentNumber: { equals: documentNumber.trim(), mode: 'insensitive' } },
      include: {
        dependents: { where: { active: true } },
        // Inclui contratos FULFILLED (titular já falecido) para permitir ainda comunicar o óbito
        // de um dependente dentro da janela pós-óbito — assertContractEligible valida essa janela.
        contracts: { where: { status: { in: ['ACTIVE', 'FULFILLED'] } } },
      },
    });

    const identityError = () =>
      new NotFoundException(
        'Não foi possível confirmar os dados indicados. Verifique o número de documento, o telemóvel e o nome, e tente novamente.',
      );

    if (!client) throw identityError();
    if (!client.phone.endsWith(phoneLast4.trim())) throw identityError();

    // Não exigimos correspondência exacta do nome — a família pode escrever de memória, sem
    // acentos ou com pequenos enganos. Aceitamos a partir de NAME_SIMILARITY_THRESHOLD de
    // semelhança de caracteres com o nome do titular ou de um dos dependentes.
    const nameMatches =
      similarity(name, client.fullName) >= NAME_SIMILARITY_THRESHOLD ||
      client.dependents.some((d) => similarity(name, d.fullName) >= NAME_SIMILARITY_THRESHOLD);
    if (!nameMatches) throw identityError();

    const contract = client.contracts[0];
    if (!contract) {
      throw new BadRequestException('Não encontrámos nenhuma apólice activa para este titular neste momento.');
    }
    await this.assertContractEligible(contract);

    return { client, contract };
  }

  private async buildInsuredList(
    client: { id: string; fullName: string; dependents: { id: string; fullName: string; relationship: string }[] },
    contractId: string,
    contractStatus: string,
  ) {
    const pendingClaims = await this.prisma.claim.findMany({
      where: { contractId, status: 'REQUESTED' },
      select: { beneficiaryType: true, dependentId: true },
    });
    const isPending = (beneficiaryType: ClaimBeneficiaryType, dependentId: string | null) =>
      pendingClaims.some((c) => c.beneficiaryType === beneficiaryType && c.dependentId === dependentId);

    return [
      // O titular só é oferecido como opção se o contrato ainda não tiver sido concluído pelo seu
      // próprio óbito — um contrato FULFILLED só pode ainda receber sinistros de dependentes.
      ...(contractStatus === 'FULFILLED'
        ? []
        : [
            {
              type: 'CLIENT' as const,
              id: client.id,
              name: client.fullName,
              relationship: 'Titular',
              hasPendingRequest: isPending('CLIENT', null),
            },
          ]),
      ...client.dependents.map((d) => ({
        type: 'DEPENDENT' as const,
        id: d.id,
        name: d.fullName,
        relationship: d.relationship,
        hasPendingRequest: isPending('DEPENDENT', d.id),
      })),
    ];
  }
}
