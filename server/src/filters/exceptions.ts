import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const { message = 'failed to request' } =
      exception instanceof HttpException
        ? (exception.getResponse() as { message: string })
        : { message: `Internal Error: ${exception as string}` };

    response.status(status).json({
      code: 1,
      message,
    });
  }
}
