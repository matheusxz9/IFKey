import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AppException } from '../exceptions/app.exception';
import { CodigoErro } from '../enums/codigo-erro.enum';

const STATUS_NAMES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

const CODIGOS_POR_STATUS: Partial<Record<number, CodigoErro>> = {
  [HttpStatus.UNAUTHORIZED]: CodigoErro.NAO_AUTENTICADO,
  [HttpStatus.FORBIDDEN]: CodigoErro.SEM_PERMISSAO,
  [HttpStatus.NOT_FOUND]: CodigoErro.NAO_ENCONTRADO,
  [HttpStatus.TOO_MANY_REQUESTS]: CodigoErro.LIMITE_REQUISICOES,
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppException) {
      this.responder(
        response,
        exception.getStatus(),
        this.getMessage(exception),
        exception.code,
      );
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      this.responder(
        response,
        status,
        this.getMessage(exception),
        CODIGOS_POR_STATUS[status] ?? CodigoErro.VALIDACAO,
      );
      return;
    }

    this.logger.error(
      `Erro inesperado: ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
    );
    this.responder(
      response,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Erro inesperado no servidor.',
      CodigoErro.ERRO_INTERNO,
    );
  }

  private responder(
    response: Response,
    status: HttpStatus,
    message: string | string[],
    code: CodigoErro,
  ): void {
    response.status(status).json({
      statusCode: status,
      error: STATUS_NAMES[status] ?? 'Error',
      message,
      code,
    });
  }

  private getMessage(exception: HttpException): string | string[] {
    const responseBody = exception.getResponse();
    if (typeof responseBody === 'string') {
      return responseBody;
    }
    if (
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'message' in responseBody
    ) {
      const message = (responseBody as { message?: string | string[] }).message;
      if (typeof message === 'string' || Array.isArray(message)) {
        return message;
      }
    }
    return 'Erro inesperado.';
  }
}
