import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UsuarioSuap {
  identificacao?: string;
  nome_usual?: string;
  nome?: string;
  email_academico?: string;
  email_google_classroom?: string;
  email_secundario?: string;
  campus?: string;
  tipo_usuario?: string;
  vinculo?: { login: string; matricula: string };
}

@Injectable()
export class SuapService {
  private readonly logger = new Logger(SuapService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('SUAP_BASE_URL') ||
      'https://suap.ifrn.edu.br';
    this.clientId = this.configService.get<string>('SUAP_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>(
      'SUAP_CLIENT_SECRET',
      '',
    );
    this.redirectUri = this.configService.get<string>('SUAP_REDIRECT_URI', '');
  }

  async trocarCodePorToken(code: string): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    });
    const response = await fetch(`${this.baseUrl}/o/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    if (!response.ok) {
      const corpo = await response.text();
      this.logger.error(
        `SUAP /o/token/ respondeu ${response.status}: ${corpo}`,
      );
      throw new UnauthorizedException('Falha ao autenticar com o SUAP.');
    }
    const data = (await response.json()) as {
      access_token: string;
      scope?: string;
      token_type?: string;
    };
    this.logger.log(
      `Token SUAP obtido. scope="${data.scope ?? '?'}" tipo="${data.token_type ?? '?'}"`,
    );
    return data.access_token;
  }

  async buscarUsuario(accessToken: string): Promise<UsuarioSuap> {
    const response = await fetch(`${this.baseUrl}/api/rh/eu/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const corpo = await response.text();
      this.logger.error(
        `SUAP /api/rh/eu/ respondeu ${response.status}: ${corpo.slice(0, 200)}`,
      );
      throw new UnauthorizedException(
        'Falha ao buscar dados do usuário no SUAP.',
      );
    }
    const usuario = (await response.json()) as UsuarioSuap;
    this.logger.log(
      `SUAP /api/rh/eu/ OK: login="${usuario.email_academico?.split('@')[0] ?? '?'}"`,
    );
    return usuario;
  }
}
