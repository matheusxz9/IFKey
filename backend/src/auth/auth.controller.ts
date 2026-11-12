import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import type { UsuarioAutenticado } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { LoginSuapDto } from './dto/login-suap.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('suap')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginSuapDto) {
    return this.authService.loginSuap(dto.code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.revokeRefreshToken(dto.refreshToken);
    return { message: 'Logout realizado com sucesso.' };
  }

  @Get('me')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: UsuarioAutenticado) {
    return user;
  }
}
