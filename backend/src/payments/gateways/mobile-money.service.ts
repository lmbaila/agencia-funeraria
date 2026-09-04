import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod } from '@prisma/client';

export interface MobileMoneyResult {
  success: boolean;
  operatorReference: string;
  message: string;
}

/**
 * Simulador de Gateway de Pagamento Móvel de Moçambique (M-Pesa / e-Mola).
 *
 * Em produção, este serviço seria substituído pela integração real com as APIs
 * da Vodacom M-Pesa (C2B) e Movitel e-Mola. Aqui simulamos o comportamento típico:
 * o cliente recebe um prompt USSD no telemóvel e confirma com o PIN, e o gateway
 * devolve o resultado de forma assíncrona (poucos segundos depois).
 */
@Injectable()
export class MobileMoneyService {
  constructor(private config: ConfigService) {}

  async requestPayment(params: {
    method: PaymentMethod;
    phone: string;
    amount: number;
  }): Promise<MobileMoneyResult> {
    const delay = Number(this.config.get('MOBILE_MONEY_SIMULATED_DELAY_MS', 2500));
    const successRate = Number(this.config.get('MOBILE_MONEY_SUCCESS_RATE', 0.9));

    await new Promise((resolve) => setTimeout(resolve, delay));

    const operator = params.method === 'MPESA' ? 'MPESA' : 'EMOLA';
    const operatorReference = `${operator}${Date.now().toString().slice(-10)}`;

    const success = Math.random() < successRate;

    return {
      success,
      operatorReference,
      message: success
        ? `Pagamento de ${params.amount} MT confirmado via ${operator === 'MPESA' ? 'M-Pesa' : 'e-Mola'} pelo número ${params.phone}.`
        : `O cliente não confirmou o PIN a tempo ou o saldo é insuficiente (${operator === 'MPESA' ? 'M-Pesa' : 'e-Mola'}).`,
    };
  }
}
