import { Controller, Get, Inject, Query, Patch, Body, Post, Delete } from '@nestjs/common';
import { ExceptionCatcher } from 'src/utils/decorators';
import { Logger } from 'winston';

import { CreateEncodeFilePathPipe } from './doc.dto';
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
  public getArticle(@Query('filePath', CreateEncodeFilePathPipe()) filePath: string) {
    this.logger.info(`[DocController] getArticle: ${filePath}`);
    return this.docService.getArticle(filePath);
  }

  @Post('/create')
  @ExceptionCatcher('Failed to create article/folder')
  /** create an article or folder */
  public createDoc(
    @Body(CreateEncodeFilePathPipe('filePath')) { filePath, isFile }: { filePath: string; isFile: boolean },
  ) {
    this.logger.info(`[DocController] create ${isFile ? 'article' : 'folder'}: ${filePath}`);
    return this.docService.createDoc(filePath, isFile);
  }

  @Patch('/update')
  @ExceptionCatcher('Failed to update article')
  public updateArticle(
    @Body(CreateEncodeFilePathPipe('filePath')) { filePath, content }: { filePath: string; content: string },
  ) {
    this.logger.info(`[DocController] updateArticle: ${filePath}`);
    this.docService.updateArticle(filePath, content);
  }

  @Patch('/update-name')
  @ExceptionCatcher('Failed to update article/folder name')
  /** update article or folder name */
  public updateDocName(
    @Body(CreateEncodeFilePathPipe('filePath'))
    { filePath, name, isFile }: { filePath: string; name: string; isFile: boolean },
  ) {
    this.logger.info(`[DocController] update ${isFile ? 'article' : 'folder'} name: ${filePath}`);
    this.docService.modifyName(filePath, name, isFile);
  }

  @Patch('/copy-cut')
  @ExceptionCatcher('Failed to copy/cut article/folder')
  public copyCutDoc(
    @Body(CreateEncodeFilePathPipe(['copyCutPath', 'pastePath']))
    copyCutInfo: {
      copyCutPath: string;
      pastePath: string;
      isCopy: boolean;
      isFile: boolean;
    }[],
  ) {
    copyCutInfo.forEach(({ copyCutPath, pastePath, isCopy, isFile }) => {
      this.logger.info(
        `[DocController] ${isCopy ? 'copy' : 'cut'} ${isFile ? 'article' : 'folder'}: ${copyCutPath} -> ${pastePath}`,
      );
      this.docService.copyCutDoc(copyCutPath, pastePath, isCopy, isFile);
    });
  }

  @Delete('/delete')
  @ExceptionCatcher('Failed to delete article/folder')
  public deleteDoc(@Body(CreateEncodeFilePathPipe('filePath')) deleteInfo: { filePath: string; isFile: boolean }[]) {
    deleteInfo.forEach(({ filePath, isFile }) => {
      this.logger.info(`[DocController] delete ${isFile ? 'article' : 'folder'}: ${filePath}`);
      this.docService.deleteDoc(filePath, isFile);
    });
  }

  @Post('/refresh')
  @ExceptionCatcher('Failed to refresh docs')
  public refreshDocs() {
    this.logger.info('[DocController] refresh docs.');
    this.docService.refreshDoc();
  }
}
