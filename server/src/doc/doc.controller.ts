import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ExceptionCatcher } from 'src/utils/decorators';
import { Logger } from 'winston';

import { DocService } from './doc.service';

@Controller('docs')
export class DocController {
  constructor(private readonly docService: DocService, @Inject('winston') private readonly logger: Logger) {}

  @Get('/')
  @ExceptionCatcher('Failed to get docs')
  public getDocs() {
    this.logger.info('[DocController] getDocs.');
    return this.docService.getDocs();
  }

  @Get('/nor-docs')
  @ExceptionCatcher('Failed to get normalized docs')
  public getNormalizedDocs() {
    this.logger.info('[DocController] getNormalizedDocs.');
    return this.docService.getNormalizedDocs();
  }

  @Get('/article')
  @ExceptionCatcher('Failed to get article')
  public getArticle(@Query('filePath') filePath: string) {
    this.logger.info(`[DocController] getArticle: ${filePath}`);
    return this.docService.getArticle(filePath);
  }
}
