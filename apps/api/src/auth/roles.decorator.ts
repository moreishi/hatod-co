import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "hailing:roles";

/** Required roles, e.g. @Roles('ADMIN:SUPER_ADMIN') or @Roles('AGENCY:*') prefix. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
