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
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppException) {
      const status: HttpStatus = exception.getStatus();
      response.status(status).json({
        statusCode: status,
        error: STATUS_NAMES[status] ?? 'Error',
        message: this.getMessage(exception),
        code: exception.code,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status: HttpStatus = exception.getStatus();
      let code: CodigoErro;
      if (status === HttpStatus.UNAUTHORIZED) {
        code = CodigoErro.NAO_AUTENTICADO;
      } else if (status === HttpStatus.FORBIDDEN) {
        code = CodigoErro.SEM_PERMISSAO;
      } else if (status === HttpStatus.NOT_FOUND) {
        code = CodigoErro.NAO_ENCONTRADO;
      } else {
        code = CodigoErro.VALIDACAO;
      }
      response.status(status).json({
        statusCode: status,
        error: STATUS_NAMES[status] ?? 'Error',
        message: this.getMessage(exception),
        code,
      });
      return;
    }

    this.logger.error(
      `Erro inesperado: ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: STATUS_NAMES[HttpStatus.INTERNAL_SERVER_ERROR],
      message: 'Erro inesperado no servidor.',
      code: CodigoErro.ERRO_INTERNO,
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
