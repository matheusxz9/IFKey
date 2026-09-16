import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface VinculoSuap {
  login: string;
  matricula: string;
}

export interface UsuarioSuap {
  matricula: string;
  nome_usual: string;
  vinculo?: VinculoSuap;
}

@Injectable()
export class SuapService {
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
      throw new UnauthorizedException('Falha ao autenticar com o SUAP.');
    }
    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  async buscarUsuario(accessToken: string): Promise<UsuarioSuap> {
    const response = await fetch(`${this.baseUrl}/api/eu/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new UnauthorizedException(
        'Falha ao buscar dados do usuário no SUAP.',
      );
    }
    return (await response.json()) as UsuarioSuap;
  }
}
