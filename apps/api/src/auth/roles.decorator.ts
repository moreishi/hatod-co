import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "hailing:roles";
export const PUBLIC_KEY = "hailing:public";

/** Required roles, e.g. @Roles('ADMIN:SUPER_ADMIN') or @Roles('AGENCY:*') prefix. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** Skip authentication — for invitation acceptance and similar public flows. */
export const Public = () => SetMetadata(PUBLIC_KEY, true);
