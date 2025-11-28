import { Catch, ExceptionFilter, HttpException, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { projectRoot } from 'src/utils';

@Catch()
export class FallbackFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status === HttpStatus.NOT_FOUND && !request.url.startsWith('/api')) {
      response.status(HttpStatus.NOT_FOUND).sendFile(projectRoot('client/build/index.html'));
      return;
    }
  }
}
