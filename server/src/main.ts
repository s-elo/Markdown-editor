import { NestFactory } from '@nestjs/core';
import open from 'open';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/exceptions';
import { FallbackFilter } from './filters/fallback';
import { UnifyResponseInterceptor } from './interceptors/unify-response';

const DEFAULT_PORT = 3024;
const port = process.env.PORT ?? DEFAULT_PORT;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new UnifyResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(), new FallbackFilter());

  await app.listen(port);

  if (process.env.NODE_ENV === 'production') {
    void open(`http://localhost:${port}`);
  }

  console.log(`Server is running on port http://localhost:${port}`);
}

void bootstrap();
