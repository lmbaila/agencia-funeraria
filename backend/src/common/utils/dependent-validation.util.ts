import { BadRequestException } from '@nestjs/common';
import { calculateAge } from './date.util';

/** Diferença mínima de idade, em anos, entre o titular e um dependente registado como Pai/Mãe. */
export const MIN_PARENT_AGE_GAP = 12;
/** Idade mínima para um dependente registado como Cônjuge. */
export const MIN_SPOUSE_AGE = 18;

/**
 * Valida a data de nascimento de um dependente: não pode ser uma data futura e, para os
 * parentescos "Pai"/"Mãe"/"Cônjuge", a idade tem de ser compatível com esse parentesco face
 * à idade do titular. Usado tanto na adesão inicial (antes de o cliente existir na BD) como na
 * inclusão/edição de dependentes de um cliente já registado.
 */
export function assertValidDependentBirthDate(
  relationship: string,
  dependentBirthDate: Date,
  clientBirthDate: Date,
  now: Date = new Date(),
) {
  if (dependentBirthDate > now) {
    throw new BadRequestException('A data de nascimento do dependente não pode ser uma data futura.');
  }

  const dependentAge = calculateAge(dependentBirthDate, now);

  if (relationship === 'Pai' || relationship === 'Mãe') {
    const clientAge = calculateAge(clientBirthDate, now);
    if (dependentAge < clientAge + MIN_PARENT_AGE_GAP) {
      throw new BadRequestException(
        `A idade indicada não é compatível com o parentesco "${relationship}": tem de ser pelo menos ${MIN_PARENT_AGE_GAP} anos mais velho(a) do que o titular.`,
      );
    }
  }

  if (relationship === 'Cônjuge' && dependentAge < MIN_SPOUSE_AGE) {
    throw new BadRequestException(`O(a) cônjuge tem de ter pelo menos ${MIN_SPOUSE_AGE} anos.`);
  }
}
