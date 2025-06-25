import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/exceptions';
import { UnifyResponseInterceptor } from './interceptors/unify-response';

const DEFAULT_PORT = 3024;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new UnifyResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? DEFAULT_PORT);
  console.log(`Server is running on port http://localhost:${process.env.PORT ?? DEFAULT_PORT}`);
}

void bootstrap();
