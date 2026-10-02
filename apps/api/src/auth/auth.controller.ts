import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, LoginSchema } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(res: Response, rawRefreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieSecure = process.env.COOKIE_SECURE === 'true' || isProduction;

    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: Number(process.env.JWT_REFRESH_EXPIRATION || 28800) * 1000,
      secure: cookieSecure,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      throw new UnauthorizedException('Dados de login inválidos.');
    }

    const userAgent = req.headers['user-agent'] as string | undefined;
    const ipAddress = req.ip;

    const result = await this.authService.login(
      parsed.data.email,
      parsed.data.password,
      userAgent,
      ipAddress,
    );

    this.setRefreshTokenCookie(res, result.rawRefreshToken);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Sessão expirada ou refresh token ausente.');
    }

    const userAgent = req.headers['user-agent'] as string | undefined;
    const ipAddress = req.ip;

    const result = await this.authService.refresh(rawRefreshToken, userAgent, ipAddress);

    this.setRefreshTokenCookie(res, result.rawRefreshToken);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.refreshToken;
    await this.authService.logout(rawRefreshToken);

    res.clearCookie('refreshToken', {
      path: '/api/auth',
    });

    return {
      success: true,
      message: 'Sessão encerrada com sucesso.',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    return {
      user: req.user,
    };
  }
}
