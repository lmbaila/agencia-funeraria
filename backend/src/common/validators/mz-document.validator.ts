import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { isValidDocumentNumber, isValidMzDistrict, MZ_BI_MESSAGE, MZ_PASSPORT_MESSAGE } from '../utils/mz-validators';

/**
 * Valida o número de documento de acordo com o tipo (BI ou Passaporte) indicado
 * no mesmo objecto (campo `documentType`).
 */
export function IsValidMzDocumentNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidMzDocumentNumber',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments) {
          const documentType = (args.object as any).documentType ?? 'BI';
          return typeof value === 'string' && isValidDocumentNumber(documentType, value);
        },
        defaultMessage(args: ValidationArguments) {
          const documentType = (args.object as any).documentType ?? 'BI';
          return documentType === 'PASSAPORTE' ? MZ_PASSPORT_MESSAGE : MZ_BI_MESSAGE;
        },
      },
    });
  };
}

/**
 * Valida se o distrito indicado pertence à província indicada (campo `province`
 * no mesmo objecto).
 */
export function IsValidMzDistrict(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidMzDistrict',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments) {
          const province = (args.object as any).province;
          return typeof value === 'string' && isValidMzDistrict(province, value);
        },
        defaultMessage(args: ValidationArguments) {
          const province = (args.object as any).province;
          return `Distrito inválido para a província "${province}".`;
        },
      },
    });
  };
}
