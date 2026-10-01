import {
  Inject,
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, PUBLIC_KEY } from "./roles.decorator.js";
import { TokenService } from "./token.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * Server-side RBAC (spec rule 49). Never rely on frontend authorization.
 * Supports exact roles and `PREFIX:*` wildcards (e.g. AGENCY:abc:*).
 * Tokens carrying a session id (jti) are honored only while that Session
 * row exists and is unrevoked; pre-session tokens are grandfathered.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
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
    if (payload.jti) {
      const session = await this.prisma.session.findUnique({
        where: { id: payload.jti },
      });
      if (!session || session.revokedAt || session.userId !== payload.sub)
        return false;
    }
    (req as { user?: unknown }).user = {
      sub: payload.sub,
      roles: payload.roles,
      jti: payload.jti,
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
