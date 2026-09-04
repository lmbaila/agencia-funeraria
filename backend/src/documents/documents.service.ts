import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { addMonths } from '../common/utils/date.util';

const AGENCY = {
  name: 'AGÊNCIA FUNERÁRIA ESPÍRITO SANTO',
  tagline: 'Assistência Funerária · Moçambique',
  address: 'Bairro Matola A, Av. Da Namaacha, Km 11, Matola, Província de Maputo',
  nuit: '401463860',
  owner: 'Hélder Guivalar',
};

const COLOR = {
  ink: '#1A1A1A',
  gray: '#6B7280',
  accent: '#8C4A2F',
  line: '#E2E2E2',
};

const PAGE_MARGIN = 56;
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2; // A4 width in points minus margins

function formatDate(date?: Date | null): string {
  if (!date) return '____/____/________';
  return new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value: any): string {
  return `${Number(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
}

const NUMBER_WORDS_PT = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze'];

function gracePeriodClauseText(months: number): string {
  if (months <= 0) {
    return 'O(a) Contratante tem direito aos benefícios do plano de imediato após o efectivo pagamento da taxa de adesão, sem período de carência.';
  }
  const word = NUMBER_WORDS_PT[months];
  const spelled = word ? ` (${word})` : '';
  const unit = months === 1 ? 'mês' : 'meses';
  return `O(a) Contratante terá direito aos benefícios do plano depois de cumprido o período de carência inicial de ${months}${spelled} ${unit}, contados da data do efectivo pagamento da taxa de adesão.`;
}

const FREQUENCY_LABEL: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  MPESA: 'M-Pesa',
  EMOLA: 'E-Mola',
  CASH: 'Numerário',
  POS: 'POS (Cartão)',
  BANK_TRANSFER: 'Transferência Bancária',
};

/** Terceiro elemento opcional: `true` obriga o campo a ocupar a linha inteira (ex: moradas longas). */
type FieldPair = [label: string, value: string, wide?: boolean];

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  private async loadContract(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { client: { include: { dependents: { where: { active: true } } } }, plan: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    return contract;
  }

  async generateContractPdf(contractId: string): Promise<PDFKit.PDFDocument> {
    const contract = await this.loadContract(contractId);
    const { client, plan } = contract;
    const settings = await this.settingsService.get();
    const lateFeePercent = (Number(settings.lateFeeMonthlyRate) * 100).toLocaleString('pt-PT', {
      maximumFractionDigits: 2,
    });
    const doc = this.newDocument();

    this.letterhead(doc, `Contrato Nº ${contract.contractNumber}`);
    this.bigTitle(doc, 'CONTRATO DE ASSESSORIA E PRESTAÇÃO DE SERVIÇOS FUNERÁRIOS');

    this.paragraph(
      doc,
      `${AGENCY.name}, sedeada na Província de Maputo, Município da Matola, ${AGENCY.address}, titular do NUIT ${AGENCY.nuit}, neste acto representada pelo Senhor ${AGENCY.owner}, na qualidade de proprietário, com poderes bastantes para este acto, doravante designada por Contratada ou Prestadora,`,
    );
    doc.moveDown(0.3);
    this.paragraph(doc, 'E');
    doc.moveDown(0.1);
    this.paragraph(
      doc,
      `${client.fullName}, maior, de nacionalidade ${client.nationality}, natural de ${client.placeOfBirth}, portador do documento de identificação nº ${client.documentNumber}, doravante designado(a) por Contratante ou Titular, também identificado(a) na Ficha de Adesão nº ${client.clientCode}, que passa a fazer parte integrante deste contrato.`,
    );

    this.sectionTitle(doc, 'Cláusula Primeira · Objecto do Contrato');
    this.paragraph(
      doc,
      'O presente contrato tem por objecto a assistência funerária a ser prestada pela contratada por meio de assessoria e intermediação de benefícios para a realização de homenagens póstumas, mediante a comercialização, em caráter de exclusividade, dos respectivos planos de assistência funerária.',
    );

    this.sectionTitle(doc, 'Cláusula Quarta · Duração');
    this.paragraph(
      doc,
      `O presente contrato tem uma duração de ${contract.durationMonths} meses, a contar de ${formatDate(contract.startDate)}, podendo ser prorrogado por mútuo acordo mediante termo aditivo.`,
    );

    this.sectionTitle(doc, 'Cláusula Oitava · Remuneração, Forma de Pagamento e Mora');
    this.paragraph(
      doc,
      `O(a) Contratante obriga-se a pagar as prestações de acordo com o plano ${plan.displayName}, com periodicidade ${FREQUENCY_LABEL[contract.paymentFrequency]}, no valor de ${formatMoney(contract.installmentAmount)}, com início 30 dias após a assinatura deste contrato e pagamento da taxa de adesão de ${formatMoney(contract.membershipFeeAmount)} (10% do valor do plano). A falta de pagamento implica juros de mora de ${lateFeePercent}% ao mês sobre o valor em falta.`,
    );

    this.sectionTitle(doc, 'Cláusula Nona · Plano de Assistência Funerária Contratado');
    this.fieldGrid(doc, [
      ['Plano', plan.displayName],
      ['Cobertura', `${formatMoney(plan.coverageMin)}${plan.coverageMax ? ` a ${formatMoney(plan.coverageMax)}` : ''}`],
      ['Benefício', plan.urnDescription ?? '-'],
    ]);

    this.sectionTitle(doc, 'Cláusula Décima · Carências');
    this.paragraph(doc, gracePeriodClauseText(settings.gracePeriodMonths));

    this.sectionTitle(doc, 'Cláusula Décima Quinta · Litígios');
    this.paragraph(
      doc,
      'As partes convencionam o foro do Tribunal Judicial da Cidade de Maputo para a resolução de qualquer litígio emergente da execução ou interpretação do presente contrato.',
    );

    this.signatureBlock(doc, [
      { label: 'O (A) Contratante', name: client.fullName },
      { label: 'A Contratada', name: AGENCY.owner },
    ]);

    this.finalize(doc);
    return doc;
  }

  /** Aditivo de prorrogação — gerado a partir de um addendum DURATION_EXTENSION específico,
   * usando os valores nele guardados (não os actuais do contrato, que podem já ter mudado
   * com prorrogações posteriores). */
  async generateExtensionAddendumPdf(addendumId: string): Promise<PDFKit.PDFDocument> {
    const addendum = await this.prisma.addendum.findUnique({
      where: { id: addendumId },
      include: { contract: { include: { client: true, plan: true } } },
    });
    if (!addendum) throw new NotFoundException('Aditivo não encontrado');
    if (addendum.type !== 'DURATION_EXTENSION' || addendum.additionalMonths == null || addendum.newDurationMonths == null) {
      throw new BadRequestException('Este aditivo não corresponde a uma prorrogação de contrato.');
    }

    const { contract } = addendum;
    const { client, plan } = contract;
    const staffName = await this.resolveStaffName(addendum.createdBy);
    const doc = this.newDocument();

    this.letterhead(doc, `Aditivo Nº ${addendum.id.slice(0, 8).toUpperCase()}`);
    this.bigTitle(doc, 'ADITIVO DE PRORROGAÇÃO', `Contrato Nº ${contract.contractNumber}`);

    this.paragraph(
      doc,
      `${AGENCY.name}, ${AGENCY.address}, NUIT ${AGENCY.nuit}, certifica que o contrato de assistência funerária abaixo identificado foi prorrogado nos termos deste aditivo, mantendo-se inalteradas as restantes cláusulas.`,
    );

    this.sectionTitle(doc, 'Identificação do Contrato');
    this.fieldGrid(doc, [
      ['Nº do Contrato', contract.contractNumber],
      ['Titular', client.fullName],
      ['Documento do Titular', `${client.documentType} nº ${client.documentNumber}`],
      ['Plano', plan.displayName],
    ]);

    this.sectionTitle(doc, 'Termos da Prorrogação');
    this.fieldGrid(doc, [
      ['Prorrogação', `${addendum.additionalMonths} mes(es)`],
      ['Nova duração total do contrato', `${addendum.newDurationMonths} meses`],
      ['Data do aditivo', formatDate(addendum.createdAt)],
    ]);

    this.signatureBlock(doc, [
      { label: 'A Agência Funerária', name: AGENCY.owner },
      { label: 'Processado por', name: staffName },
    ]);

    this.finalize(doc);
    return doc;
  }

  async generateAdhesionPdf(contractId: string): Promise<PDFKit.PDFDocument> {
    const contract = await this.loadContract(contractId);
    const { client, plan } = contract;
    const doc = this.newDocument();

    this.letterhead(doc, `Ficha Nº ${client.clientCode}`);
    this.bigTitle(doc, 'FICHA DE ADESÃO');

    this.sectionTitle(doc, 'Dados do Titular');
    this.fieldGrid(doc, [
      ['Nome', client.fullName],
      ['Nacionalidade', client.nationality],
      ['Natural de', client.placeOfBirth],
      ['Documento', `${client.documentType} nº ${client.documentNumber}`],
      ['Data de Nascimento', formatDate(client.birthDate)],
      ['Estado Civil', client.maritalStatus ?? '-'],
      ['Telefone', client.phone],
      [
        'Endereço',
        `${client.province}, ${client.district}, ${client.neighborhood} ${client.addressLine ?? ''} Q.${client.block ?? '-'} Casa nº ${client.houseNumber ?? '-'}`,
        true,
      ],
    ]);

    this.sectionTitle(doc, 'Plano Contratado');
    this.fieldGrid(doc, [
      ['Pacote Seleccionado', plan.displayName],
      ['Valor da Prestação', `${formatMoney(contract.installmentAmount)} (${FREQUENCY_LABEL[contract.paymentFrequency]})`],
      ['Taxa de Adesão (10%)', formatMoney(contract.membershipFeeAmount)],
      ['Duração do Contrato', `${contract.durationMonths} meses`],
    ]);

    this.sectionTitle(doc, 'Beneficiários e Grau de Parentesco');
    if (client.dependents.length === 0) {
      this.paragraph(doc, 'Nenhum beneficiário registado.');
    } else {
      this.bulletList(doc, client.dependents.map((d) => `${d.fullName} (${d.relationship})`));
    }

    this.signatureBlock(doc, [
      { label: 'A Agência Funerária', name: AGENCY.owner },
      { label: 'O (A) Aderente', name: client.fullName },
    ]);

    this.finalize(doc);
    return doc;
  }

  async generateClaimPdf(claimId: string): Promise<PDFKit.PDFDocument> {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        contract: { include: { client: { include: { dependents: { where: { active: true } } } }, plan: true } },
        dependent: true,
      },
    });
    if (!claim) throw new NotFoundException('Sinistro não encontrado');
    if (claim.status === 'REQUESTED' || claim.status === 'REJECTED') {
      throw new BadRequestException(
        'Este pedido ainda não foi confirmado presencialmente na agência. O Termo de Sinistro só fica disponível após a confirmação.',
      );
    }

    const { contract } = claim;
    const { client, plan } = contract;
    const doc = this.newDocument();

    this.letterhead(doc, `Termo Nº ${claim.id.slice(0, 8).toUpperCase()}`);
    this.bigTitle(doc, 'TERMO DE SINISTRO', 'Registo de Falecimento e Activação da Cobertura');

    this.paragraph(
      doc,
      `${AGENCY.name}, ${AGENCY.address}, NUIT ${AGENCY.nuit}, certifica ter registado o presente sinistro no âmbito do contrato de assistência funerária abaixo identificado.`,
    );

    this.sectionTitle(doc, 'Identificação do Contrato');
    this.fieldGrid(doc, [
      ['Nº do Contrato', contract.contractNumber],
      ['Titular', client.fullName],
      ['Documento do Titular', `${client.documentType} nº ${client.documentNumber}`],
      ['Plano', plan.displayName],
      [
        'Cobertura',
        `${formatMoney(plan.coverageMin)}${plan.coverageMax ? ` a ${formatMoney(plan.coverageMax)}` : ''} · ${plan.urnDescription ?? '-'}`,
      ],
    ]);

    this.sectionTitle(doc, 'Identificação do Falecido');
    const fields: FieldPair[] = [
      [
        'Beneficiário',
        claim.beneficiaryType === 'CLIENT' ? `${client.fullName} (Titular)` : `${claim.deceasedName} (${claim.dependent?.relationship ?? 'Dependente'})`,
      ],
      ['Data do Falecimento', formatDate(claim.dateOfDeath)],
      ['Data de Registo do Sinistro', formatDate(claim.createdAt)],
    ];
    if (claim.notes) fields.push(['Observações', claim.notes]);
    this.fieldGrid(doc, fields);

    this.sectionTitle(doc, 'Situação do Contrato');
    this.paragraph(doc, await this.contractSituationText(claim, contract));

    this.signatureBlock(doc, [
      { label: 'A Agência Funerária', name: AGENCY.owner },
      { label: 'Responsável pelo Registo', name: await this.resolveStaffName(claim.registeredById) },
    ]);

    this.finalize(doc);
    return doc;
  }

  /** Texto da secção "Situação do Contrato" do Termo de Sinistro — explica se o contrato se
   * conclui ou se mantém, e, quando aplicável, até quando ainda é possível comunicar o óbito
   * de outro beneficiário coberto (prazo pós-óbito do titular, definido em Configurações). */
  /** Nos documentos impressos, o responsável aparece pelo nome próprio e apelido, nunca pelo
   * identificador de login — cai de volta para o identificador apenas se o utilizador não
   * tiver nome registado (ex: contas antigas) ou já não existir. */
  private async resolveStaffName(identifier: string | null): Promise<string> {
    if (!identifier) return '-';
    const user = await this.prisma.user.findUnique({ where: { identifier }, select: { firstName: true, lastName: true } });
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    return identifier;
  }

  private async contractSituationText(
    claim: { beneficiaryType: string; dateOfDeath: Date; contractId: string },
    contract: { status: string; client: { dependents: { id: string }[] } },
  ): Promise<string> {
    if (claim.beneficiaryType === 'CLIENT') {
      const dependentsCount = contract.client.dependents.length;
      if (dependentsCount === 0) {
        return 'Por se tratar do falecimento do(a) Titular, o presente contrato é dado como concluído (serviço prestado), não havendo lugar a mais mensalidades.';
      }
      const settings = await this.settingsService.get();
      const deadline = addMonths(claim.dateOfDeath, settings.postDeathClaimWindowMonths);
      const who = dependentsCount === 1 ? 'o dependente coberto' : `os ${dependentsCount} dependentes cobertos`;
      const verb = dependentsCount === 1 ? 'pode' : 'podem';
      return `Por se tratar do falecimento do(a) Titular, o presente contrato é dado como concluído (serviço prestado), não havendo lugar a mais mensalidades. Até ${formatDate(deadline)}, ${who} ainda ${verb} ter o óbito comunicado e confirmado ao abrigo deste contrato.`;
    }

    if (contract.status === 'FULFILLED') {
      const titularClaim = await this.prisma.claim.findFirst({
        where: { contractId: claim.contractId, beneficiaryType: 'CLIENT', status: 'REGISTERED' },
        select: { dateOfDeath: true },
      });
      if (titularClaim) {
        const settings = await this.settingsService.get();
        const deadline = addMonths(titularClaim.dateOfDeath, settings.postDeathClaimWindowMonths);
        return `Por se tratar do falecimento de um dependente coberto, comunicado dentro do prazo de ${settings.postDeathClaimWindowMonths} meses após o falecimento do(a) Titular (até ${formatDate(deadline)}), o presente sinistro foi igualmente registado, ainda que o contrato já se encontre concluído pelo óbito do(a) Titular.`;
      }
    }

    return 'Por se tratar do falecimento de um dependente coberto, o contrato do(a) Titular mantém-se em vigor para os restantes beneficiários.';
  }

  /**
   * Comprovativo do pedido de comunicação de óbito submetido online: documento provisório,
   * sem valor legal de registo, que a família apresenta na agência para dar seguimento ao processo.
   */
  async generateClaimRequestReceiptPdf(requestBatchId: string): Promise<PDFKit.PDFDocument> {
    const claims = await this.prisma.claim.findMany({
      where: { requestBatchId },
      include: { contract: { include: { client: true, plan: true } }, dependent: true },
      orderBy: { createdAt: 'asc' },
    });
    if (claims.length === 0) throw new NotFoundException('Comprovativo não encontrado.');

    const first = claims[0];
    const { contract } = first;
    const { client } = contract;
    const doc = this.newDocument();

    this.letterhead(doc, `Protocolo Nº ${requestBatchId.slice(0, 8).toUpperCase()}`);
    this.bigTitle(doc, 'COMPROVATIVO DE COMUNICAÇÃO DE ÓBITO', 'Pedido submetido, aguarda confirmação presencial na agência');

    this.paragraph(
      doc,
      `A ${AGENCY.name} recebeu, com o devido respeito, a comunicação de falecimento abaixo identificada e apresenta as suas mais sentidas condolências à família. Este documento confirma a submissão do pedido. A activação da cobertura só se torna efectiva após confirmação presencial na agência.`,
    );

    this.sectionTitle(doc, 'Protocolo');
    this.fieldGrid(doc, [
      ['Nº de Protocolo', requestBatchId.slice(0, 8).toUpperCase()],
      ['Data e Hora do Pedido', formatDateTime(first.createdAt)],
    ]);

    this.sectionTitle(doc, 'Identificação do Contrato');
    this.fieldGrid(doc, [
      ['Nº do Contrato', contract.contractNumber],
      ['Titular', client.fullName],
    ]);

    this.sectionTitle(doc, 'Pessoa(s) Comunicada(s)');
    this.fieldGrid(
      doc,
      claims.map((claim): FieldPair => [
        claim.beneficiaryType === 'CLIENT' ? 'Titular' : claim.dependent?.relationship ?? 'Dependente',
        `${claim.deceasedName}, falecido(a) em ${formatDate(claim.dateOfDeath)}`,
      ]),
    );
    if (first.notes) this.fieldGrid(doc, [['Observações', first.notes]]);

    this.sectionTitle(doc, 'Comunicado Por');
    this.fieldGrid(doc, [
      ['Nome', first.requesterName ?? '-'],
      ['Telefone', first.requesterPhone ?? '-'],
      ['Relação com o(a) Falecido(a)', first.requesterRelationship ?? '-'],
    ]);

    this.sectionTitle(doc, 'Próximos Passos');
    this.paragraph(
      doc,
      'Para finalizar o processo, pedimos que se desloque a uma das nossas agências, preferencialmente nos próximos dias úteis, munido(a) dos seguintes documentos:',
    );
    this.bulletList(doc, [
      'Certidão de Óbito',
      'Documento de identificação do(a) falecido(a), se disponível',
      'O seu documento de identificação',
    ]);
    doc.moveDown(0.2);
    this.paragraph(
      doc,
      'Um dos nossos agentes irá confirmar consigo os dados e emitir o Termo de Sinistro, que formaliza a activação da cobertura.',
    );

    doc.moveDown(0.6);
    doc
      .font('Helvetica-Oblique')
      .fontSize(8.5)
      .fillColor(COLOR.gray)
      .text('Este comprovativo não substitui o Termo de Sinistro e não tem, por si só, valor legal de registo do sinistro.', {
        align: 'center',
      });
    doc.font('Helvetica').fillColor(COLOR.ink);

    this.finalize(doc);
    return doc;
  }

  async generateReceiptPdf(paymentId: string): Promise<PDFKit.PDFDocument> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { contract: { include: { client: true, plan: true } }, installment: true },
    });
    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('Só é possível emitir recibo para pagamentos confirmados.');
    }

    const { contract } = payment;
    const { client } = contract;
    const doc = this.newDocument();

    this.letterhead(doc, `Recibo Nº ${payment.id.slice(0, 8).toUpperCase()}`);
    this.bigTitle(doc, 'RECIBO DE PAGAMENTO');

    this.paragraph(
      doc,
      `${AGENCY.name}, ${AGENCY.address}, NUIT ${AGENCY.nuit}, certifica ter recebido de ${client.fullName} a quantia abaixo discriminada.`,
    );

    this.sectionTitle(doc, 'Identificação');
    this.fieldGrid(doc, [
      ['Nº do Contrato', contract.contractNumber],
      ['Titular', client.fullName],
      ['Documento do Titular', `${client.documentType} nº ${client.documentNumber}`],
    ]);

    this.sectionTitle(doc, 'Detalhe do Pagamento');
    const fields: FieldPair[] = [
      ['Descrição', payment.type === 'MEMBERSHIP_FEE' ? 'Taxa de Adesão' : 'Mensalidade'],
    ];
    if (payment.monthReference) fields.push(['Mês de Referência', payment.monthReference]);
    fields.push(
      ['Valor Pago', formatMoney(payment.amount)],
      ['Método de Pagamento', PAYMENT_METHOD_LABEL[payment.method] ?? payment.method],
    );
    if (payment.reference) fields.push(['Referência', payment.reference]);
    if (payment.phoneUsed) fields.push(['Telefone Usado', payment.phoneUsed]);
    fields.push(['Data do Pagamento', formatDate(payment.paidAt)]);
    this.fieldGrid(doc, fields);

    this.signatureBlock(doc, [{ label: 'A Agência Funerária', name: AGENCY.owner }]);

    this.finalize(doc);
    return doc;
  }

  // ---------- Construção do documento (letterhead, secções, rodapé) ----------

  private newDocument(): PDFKit.PDFDocument {
    // Margem inferior reduzida de propósito: o rodapé é desenhado a coordenadas absolutas fora da
    // zona de fluxo automático do PDFKit — se ficasse dentro da margem normal, cada chamada a
    // doc.text() aí perto do fundo dispararia uma quebra de página automática (página em branco extra).
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: PAGE_MARGIN, bottom: 24, left: PAGE_MARGIN, right: PAGE_MARGIN },
      bufferPages: true,
    });
    doc.font('Helvetica').fontSize(10).fillColor(COLOR.ink);
    return doc;
  }

  /** Identidade institucional compacta: nome/tagline à esquerda, monograma e referência à direita. */
  private letterhead(doc: PDFKit.PDFDocument, reference: string) {
    const top = doc.y;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.ink).text(AGENCY.name, PAGE_MARGIN, top, { width: 340 });
    doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.gray).text(AGENCY.tagline, PAGE_MARGIN, doc.y + 1);

    const badgeR = 15;
    const badgeCx = PAGE_MARGIN + CONTENT_WIDTH - badgeR;
    const badgeCy = top + badgeR;
    doc.circle(badgeCx, badgeCy, badgeR).fill(COLOR.ink);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#FFFFFF')
      .text('ES', badgeCx - badgeR, badgeCy - 5, { width: badgeR * 2, align: 'center' });

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLOR.gray)
      .text(reference, PAGE_MARGIN, badgeCy + badgeR + 4, { width: CONTENT_WIDTH, align: 'right' });

    const ruleY = Math.max(doc.y, badgeCy + badgeR + 16) + 6;
    doc.moveTo(PAGE_MARGIN, ruleY).lineTo(PAGE_MARGIN + CONTENT_WIDTH, ruleY).lineWidth(1).strokeColor(COLOR.line).stroke();
    doc.y = ruleY + 22;
    doc.fillColor(COLOR.ink);
  }

  /** Título do documento: tipografia grande e simples, sem caixa nem preenchimento. */
  private bigTitle(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
    doc.font('Helvetica-Bold').fontSize(23).fillColor(COLOR.ink).text(title, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
    if (subtitle) {
      doc.font('Helvetica').fontSize(10).fillColor(COLOR.gray).text(subtitle, PAGE_MARGIN, doc.y + 3, { width: CONTENT_WIDTH });
    }
    doc.moveDown(1.4);
    doc.font('Helvetica').fontSize(10).fillColor(COLOR.ink);
  }

  private sectionTitle(doc: PDFKit.PDFDocument, title: string) {
    if (doc.y > 700) doc.addPage();
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.ink).text(title.toUpperCase(), PAGE_MARGIN, doc.y, {
      characterSpacing: 0.4,
    });
    const ruleY = doc.y + 4;
    doc.moveTo(PAGE_MARGIN, ruleY).lineTo(PAGE_MARGIN + CONTENT_WIDTH, ruleY).lineWidth(0.75).strokeColor(COLOR.line).stroke();
    doc.y = ruleY + 10;
    doc.font('Helvetica').fontSize(10).fillColor(COLOR.ink);
  }

  private paragraph(doc: PDFKit.PDFDocument, text: string) {
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10).fillColor(COLOR.ink).text(text, { align: 'justify', width: CONTENT_WIDTH });
  }

  private bulletList(doc: PDFKit.PDFDocument, items: string[]) {
    doc.moveDown(0.15);
    for (const item of items) {
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink).text('-', PAGE_MARGIN, y);
      doc.font('Helvetica').fontSize(10).fillColor(COLOR.ink).text(item, PAGE_MARGIN + 12, y, { width: CONTENT_WIDTH - 12 });
      doc.moveDown(0.15);
    }
  }

  /**
   * Lista de campos "rótulo + valor" em duas colunas, sem caixas nem preenchimento: rótulo
   * pequeno em maiúsculas por cima do valor, com um traço fino a separar cada linha.
   */
  private fieldGrid(doc: PDFKit.PDFDocument, pairs: FieldPair[]) {
    doc.moveDown(0.1);
    const gap = 24;
    const colWidth = (CONTENT_WIDTH - gap) / 2;

    let i = 0;
    while (i < pairs.length) {
      const isWide = !!pairs[i][2];
      let rowPairs: FieldPair[];
      let cellWidth: number;
      if (isWide) {
        rowPairs = [pairs[i]];
        cellWidth = CONTENT_WIDTH;
        i += 1;
      } else if (i + 1 < pairs.length && !pairs[i + 1][2]) {
        rowPairs = [pairs[i], pairs[i + 1]];
        cellWidth = colWidth;
        i += 2;
      } else {
        rowPairs = [pairs[i]];
        cellWidth = colWidth;
        i += 1;
      }

      const heights = rowPairs.map(([, value]) => doc.font('Helvetica-Bold').fontSize(10).heightOfString(value, { width: cellWidth }));
      const rowHeight = Math.max(...heights) + 22;

      if (doc.y + rowHeight > 760) doc.addPage();
      const y = doc.y;

      rowPairs.forEach(([label, value], idx) => {
        const x = PAGE_MARGIN + idx * (cellWidth + gap);
        doc.font('Helvetica').fontSize(8).fillColor(COLOR.gray).text(label.toUpperCase(), x, y, { width: cellWidth, characterSpacing: 0.3 });
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink).text(value, x, y + 12, { width: cellWidth });
      });

      const ruleY = y + rowHeight - 6;
      doc.moveTo(PAGE_MARGIN, ruleY).lineTo(PAGE_MARGIN + CONTENT_WIDTH, ruleY).lineWidth(0.5).strokeColor(COLOR.line).stroke();

      doc.y = y + rowHeight + 4;
    }
    doc.font('Helvetica').fontSize(10).fillColor(COLOR.ink);
  }

  private signatureBlock(doc: PDFKit.PDFDocument, signers: { label: string; name: string }[]) {
    if (doc.y > 680) doc.addPage();
    doc.moveDown(2.2);
    doc.font('Helvetica').fontSize(9).fillColor(COLOR.gray).text(`Matola, ${formatDate(new Date())}`, PAGE_MARGIN, doc.y);
    doc.moveDown(3);

    const colWidth = CONTENT_WIDTH / signers.length;
    const y = doc.y;
    signers.forEach((signer, idx) => {
      const x = PAGE_MARGIN + idx * colWidth;
      doc.moveTo(x, y).lineTo(x + colWidth - 24, y).lineWidth(0.75).strokeColor(COLOR.line).stroke();
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR.ink).text(signer.label.toUpperCase(), x, y + 6, {
        width: colWidth - 24,
      });
      doc.font('Helvetica').fontSize(9).fillColor(COLOR.gray).text(`(${signer.name})`, x, doc.y + 1, {
        width: colWidth - 24,
      });
    });
    doc.fillColor(COLOR.ink);
  }

  /** Numera as páginas e desenha o rodapé institucional em todas elas. */
  private finalize(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const footerY = 788;
      doc.moveTo(PAGE_MARGIN, footerY).lineTo(PAGE_MARGIN + CONTENT_WIDTH, footerY).lineWidth(0.5).strokeColor(COLOR.line).stroke();
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COLOR.gray)
        .text(`${AGENCY.name} · NUIT ${AGENCY.nuit}`, PAGE_MARGIN, footerY + 6, { width: CONTENT_WIDTH - 90 })
        .text(`Página ${i - range.start + 1} de ${range.count}`, PAGE_MARGIN + CONTENT_WIDTH - 90, footerY + 6, {
          width: 90,
          align: 'right',
        });
    }
    doc.end();
  }
}
