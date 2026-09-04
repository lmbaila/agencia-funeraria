import { ageFromBirthDate } from './clientForm';

/** Parentescos que só podem existir uma vez por titular. */
export const LIMITED_RELATIONSHIPS = ['Cônjuge', 'Pai', 'Mãe'];

/** Espelha backend/src/common/utils/dependent-validation.util.ts */
export const MIN_PARENT_AGE_GAP = 12;
export const MIN_SPOUSE_AGE = 18;

/** Prazo dentro do qual o próprio cliente pode editar/remover um dependente que registou. */
export const CLIENT_EDIT_WINDOW_HOURS = 24;

export function isDependentEditWindowOpen(createdAt: string): boolean {
  const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return hours <= CLIENT_EDIT_WINDOW_HOURS;
}

/** Valida em tempo real (mesma regra do backend) e devolve a mensagem de erro, ou null se válido. */
export function dependentBirthDateError(
  relationship: string,
  birthDate: string,
  clientBirthDate?: string,
): string | null {
  if (!birthDate) {
    if (relationship === 'Pai' || relationship === 'Mãe' || relationship === 'Cônjuge') {
      return `É necessário indicar a data de nascimento para registar um(a) "${relationship}".`;
    }
    return null;
  }

  const age = ageFromBirthDate(birthDate);
  if (age === null) return 'Data de nascimento inválida.';
  if (age < 0) return 'A data de nascimento não pode ser uma data futura.';

  if ((relationship === 'Pai' || relationship === 'Mãe') && clientBirthDate) {
    const clientAge = ageFromBirthDate(clientBirthDate);
    if (clientAge !== null && age < clientAge + MIN_PARENT_AGE_GAP) {
      return `A idade indicada não é compatível com o parentesco "${relationship}": tem de ser pelo menos ${MIN_PARENT_AGE_GAP} anos mais velho(a) do que o titular.`;
    }
  }

  if (relationship === 'Cônjuge' && age < MIN_SPOUSE_AGE) {
    return `O(a) cônjuge tem de ter pelo menos ${MIN_SPOUSE_AGE} anos.`;
  }

  return null;
}

export function relationshipAlreadyTaken(
  existing: { relationship: string }[],
  relationship: string,
  excludeId?: string,
): boolean {
  if (!relationship || !LIMITED_RELATIONSHIPS.includes(relationship)) return false;
  return existing.some(
    (d: any) => d.relationship === relationship && (!excludeId || d.id !== excludeId),
  );
}

export function relationshipLimitMessage(relationship: string): string {
  return `Já existe um dependente registado como "${relationship}". Não é possível adicionar mais do que um(a) ${relationship.toLowerCase()}.`;
}
