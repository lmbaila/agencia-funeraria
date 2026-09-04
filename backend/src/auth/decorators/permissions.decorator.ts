import { SetMetadata } from '@nestjs/common';
import { Permission } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Restringe a rota às permissões indicadas. Um agente precisa de pelo menos uma
 * das permissões listadas. O ADMIN tem sempre acesso, independentemente das
 * permissões que lhe estejam atribuídas.
 */
export const RequirePermission = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
