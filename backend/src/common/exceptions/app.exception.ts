import { HttpException, HttpStatus } from '@nestjs/common';
import { CodigoErro } from '../enums/codigo-erro.enum';

export abstract class AppException extends HttpException {
  readonly code: CodigoErro;

  constructor(message: string, statusCode: HttpStatus, code: CodigoErro) {
    super(message, statusCode);
    this.code = code;
  }
}

export class ChaveIndisponivelException extends AppException {
  constructor(message = 'Chave indisponível para empréstimo.') {
    super(message, HttpStatus.CONFLICT, CodigoErro.CHAVE_INDISPONIVEL);
  }
}

export class MatriculaDuplicadaException extends AppException {
  constructor(message = 'Matrícula já cadastrada.') {
    super(message, HttpStatus.CONFLICT, CodigoErro.MATRICULA_DUPLICADA);
  }
}

export class CodigoChaveDuplicadoException extends AppException {
  constructor(message = 'Código da chave já cadastrada.') {
    super(message, HttpStatus.CONFLICT, CodigoErro.CODIGO_CHAVE_DUPLICADO);
  }
}

export class SolicitanteInativoException extends AppException {
  constructor(message = 'Solicitante inativo.') {
    super(message, HttpStatus.CONFLICT, CodigoErro.SOLICITANTE_INATIVO);
  }
}

export class EmprestimoJaDevolvidoException extends AppException {
  constructor(message = 'Empréstimo já devolvido.') {
    super(message, HttpStatus.CONFLICT, CodigoErro.EMPRESTIMO_JA_DEVOLVIDO);
  }
}

export class RecursoComEmprestimoAtivoException extends AppException {
  constructor(message = 'Recurso com empréstimo ativo.') {
    super(
      message,
      HttpStatus.CONFLICT,
      CodigoErro.RECURSO_COM_EMPRESTIMO_ATIVO,
    );
  }
}

export class NaoEncontradoException extends AppException {
  constructor(message = 'Recurso não encontrado.') {
    super(message, HttpStatus.NOT_FOUND, CodigoErro.NAO_ENCONTRADO);
  }
}
