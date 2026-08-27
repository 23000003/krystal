import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { AppLogger } from './common/app-logger';
import { corsOrigins, env } from './config/env';
import { WS_PATH } from './config/constants';

async function bootstrap() {
  const logger = new AppLogger('server');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalFilters(new ApiExceptionFilter());

  app.enableCors({ origin: corsOrigins, credentials: true });

  await app.listen(env.PORT);

  logger.info('API listening: ', {
    port: env.PORT,
    socket: WS_PATH,
  });
}

void bootstrap();
