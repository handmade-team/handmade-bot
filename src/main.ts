import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });
}
bootstrap();
