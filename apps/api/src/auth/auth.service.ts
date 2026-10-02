import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  generateRawRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  async login(email: string, password: string, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas. Verifique seu e-mail e senha.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas. Verifique seu e-mail e senha.');
    }

    // 15 minutos para access token
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET || 'chave-secreta-jwt-access-demo-planejador',
        expiresIn: Number(process.env.JWT_ACCESS_EXPIRATION || 900),
      },
    );

    // 8 horas para refresh token (duração do turno escolar)
    const rawRefreshToken = this.generateRawRefreshToken();
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + Number(process.env.JWT_REFRESH_EXPIRATION || 28800) * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      accessToken,
      expiresIn: Number(process.env.JWT_ACCESS_EXPIRATION || 900),
      rawRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refresh(rawRefreshToken: string, userAgent?: string, ipAddress?: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt !== null || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    // Rotação do token: revoga a sessão anterior
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const user = session.user;
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET || 'chave-secreta-jwt-access-demo-planejador',
        expiresIn: Number(process.env.JWT_ACCESS_EXPIRATION || 900),
      },
    );

    const newRawRefreshToken = this.generateRawRefreshToken();
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + Number(process.env.JWT_REFRESH_EXPIRATION || 28800) * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      accessToken,
      expiresIn: Number(process.env.JWT_ACCESS_EXPIRATION || 900),
      rawRefreshToken: newRawRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      try {
        await this.prisma.session.update({
          where: { tokenHash },
          data: { revokedAt: new Date() },
        });
      } catch {
        // Ignora caso a sessão já tenha sido removida ou inexistente
      }
    }

    return {
      success: true,
      message: 'Sessão encerrada com sucesso.',
    };
  }
}
