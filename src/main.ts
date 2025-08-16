import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('E-qanun Notifier')
    .setDescription('API documentation')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);
  const logger = new Logger('Bootstrap');
  logger.log(`Server listening on http://localhost:3000`);
  logger.log(`Swagger UI: http://localhost:3000/docs`);
}
bootstrap();
