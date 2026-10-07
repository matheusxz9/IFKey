import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { LoginSuapDto } from './dto/login-suap.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('suap')
  login(@Body() dto: LoginSuapDto) {
    return this.authService.loginSuap(dto.code);
  }

  @Post('refresh')
  async refresh(@Body() dto: { refreshToken: string }) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body() dto: { refreshToken: string }) {
    await this.authService.revokeRefreshToken(dto.refreshToken);
    return { message: 'Logout realizado com sucesso.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { id: number; perfil: string }) {
    return this.authService.perfil(user.id, user.perfil);
  }
}
