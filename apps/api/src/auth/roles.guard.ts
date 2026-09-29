import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator.js";
import { TokenService } from "./token.service.js";

/**
 * Server-side RBAC (spec rule 49). Never rely on frontend authorization.
 * Supports exact roles and `PREFIX:*` wildcards (e.g. AGENCY:abc:*).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return false; // deny by default
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>();
    const header = req.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return false;
    let payload;
    try {
      payload = this.tokens.verify(token);
    } catch {
      return false;
    }
    (req as { user?: unknown }).user = {
      sub: payload.sub,
      roles: payload.roles,
    };
    return required.some((need) =>
      payload.roles.some((have) => roleMatches(need, have)),
    );
  }
}

export function roleMatches(need: string, have: string): boolean {
  if (need.endsWith(":*")) return have.startsWith(need.slice(0, -1));
  return need === have;
}
