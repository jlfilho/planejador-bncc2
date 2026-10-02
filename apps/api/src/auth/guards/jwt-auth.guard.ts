import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acesso não fornecido ou formato inválido.');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'chave-secreta-jwt-access-demo-planejador',
      });

      request.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      } as AuthenticatedUser;

      return true;
    } catch {
      throw new UnauthorizedException('Token de acesso inválido ou expirado.');
    }
  }
}
