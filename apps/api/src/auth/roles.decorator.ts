import { SetMetadata } from '@nestjs/common';
import { REQUIRED_ROLES } from './guards/roles.guard';

export const Roles = (...roles: string[]) => SetMetadata(REQUIRED_ROLES, roles);
