import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Header,
  Body,
  Res,
  Req,
  Headers,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { MediaService } from './media.service';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a media file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        userId: {
          type: 'string',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userIdFromBody: string,
    @Headers('x-user-id') userIdFromHeader: string,
    @Req() req: any,
  ) {
    const userId = userIdFromHeader || userIdFromBody || req.user?.id || '00000000-0000-0000-0000-000000000000';
    const media = await this.mediaService.createMedia(userId, file);
    return {
      id: media.id,
      fileName: media.file_name,
      originalName: media.original_name,
      mimeType: media.mime_type,
      fileSize: media.file_size.toString(),
      status: media.status,
      createdAt: media.created_at,
    };
  }

  @Post('upload-base64')
  @ApiOperation({ summary: 'Upload a media file via Base64' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        base64: { type: 'string' },
        originalName: { type: 'string' },
        userId: { type: 'string' },
      },
    },
  })
  async uploadBase64(
    @Body() body: { base64: string, originalName: string, userId?: string },
    @Headers('x-user-id') userIdFromHeader: string,
    @Req() req: any,
  ) {
    const userId = userIdFromHeader || body.userId || req.user?.id || '00000000-0000-0000-0000-000000000000';
    const media = await this.mediaService.uploadBase64(userId, body.base64, body.originalName);
    return {
      id: media.id,
      fileName: media.file_name,
      originalName: media.original_name,
      mimeType: media.mime_type,
      fileSize: media.file_size.toString(),
      status: media.status,
      createdAt: media.created_at,
    };
  }

  @Post('upload-stream')
  @ApiOperation({ 
    summary: 'Upload a media file via stream',
    description: 'Directly pipe the binary file content in the request body. Requires specific headers.'
  })
  @ApiHeader({ name: 'x-original-name', description: 'Original file name with extension', required: true })
  @ApiHeader({ name: 'x-user-id', description: 'ID of the user uploading the file', required: false })
  @ApiBody({ schema: { type: 'string', format: 'binary' }, description: 'Binary file content' })
  @ApiResponse({ status: 201, description: 'Media uploaded and queued for processing' })
  async uploadStream(
    @Req() req: any,
    @Headers('x-user-id') userIdFromHeader: string,
    @Headers('x-original-name') originalName: string,
    @Headers('content-type') mimeType: string,
    @Headers('content-length') contentLength: string,
  ) {
    const userId = userIdFromHeader || req.user?.id || '00000000-0000-0000-0000-000000000000';
    const media = await this.mediaService.createMediaFromStream(
      userId,
      req,
      originalName || 'unnamed_file',
      mimeType || 'application/octet-stream',
      contentLength ? parseInt(contentLength) : undefined,
    );
    return {
      id: media.id,
      fileName: media.file_name,
      originalName: media.original_name,
      mimeType: media.mime_type,
      fileSize: media.file_size.toString(),
      status: media.status,
      createdAt: media.created_at,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media metadata' })
  @ApiResponse({ status: 200, description: 'Returns media metadata' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async getMetadata(@Param('id', ParseUUIDPipe) id: string) {
    const media = await this.mediaService.getMedia(id);
    return {
      id: media.id,
      fileName: media.file_name,
      originalName: media.original_name,
      mimeType: media.mime_type,
      fileSize: media.file_size.toString(),
      status: media.status,
      createdAt: media.created_at,
    };
  }

  @Get(':id/base64')
  @ApiOperation({ summary: 'Get media as Base64 data URI' })
  @ApiResponse({ status: 200, description: 'Returns base64 data URI' })
  async getBase64(@Param('id', ParseUUIDPipe) id: string) {
    const media = await this.mediaService.getMedia(id);
    const buffer = await this.mediaService['storage'].getFile(media.storage_path);
    return {
      dataUri: `data:${media.mime_type};base64,${buffer.toString('base64')}`,
      mimeType: media.mime_type,
      fileName: media.original_name,
    };
  }

  @Get(':id/thumbnail')
  @ApiOperation({ summary: 'Get media thumbnail' })
  async getThumbnail(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const media = await this.mediaService.getMedia(id);
    const metadata = media.metadata as any;
    const thumbPath = metadata?.thumbnail;
    
    if (!thumbPath) {
      return res.status(404).send('Thumbnail not ready or not available');
    }
    
    const { stream } = await this.mediaService.getMediaStreamByIdentifier(thumbPath);
    res.setHeader('Content-Type', 'image/webp');
    stream.pipe(res);
  }

  @Get(':id/info')
  @ApiOperation({ summary: 'Get detailed media info (metadata)' })
  async getInfo(@Param('id', ParseUUIDPipe) id: string) {
    const media = await this.mediaService.getMedia(id);
    return {
      ...media,
      fileSize: media.file_size.toString(),
      metadata: media.metadata,
    };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get a presigned download URL' })
  @ApiResponse({ status: 200, description: 'Returns a temporary download link' })
  async getDownloadUrl(@Param('id', ParseUUIDPipe) id: string) {
    const url = await this.mediaService.getDownloadUrl(id);
    return { url };
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream media file' })
  @ApiResponse({ status: 200, description: 'Binary stream of the media' })
  async streamFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { stream, mimeType, originalName, size } = await this.mediaService.getMediaStream(id);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    if (size) {
      res.setHeader('Content-Length', size.toString());
    }
    
    stream.pipe(res);
  }

  @Get(':id/hls/index.m3u8')
  @ApiOperation({ summary: 'Get HLS playlist' })
  @ApiResponse({ status: 200, description: 'M3U8 playlist for HLS streaming' })
  @ApiResponse({ status: 404, description: 'HLS not available for this media' })
  async getHlsPlaylist(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const media = await this.mediaService.getMedia(id);
    if (!media.metadata || !(media.metadata as any).hls_path) {
      return res.status(404).send('HLS not ready or not supported for this media');
    }
    const { stream } = await this.mediaService.getMediaStreamByIdentifier((media.metadata as any).hls_path);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    stream.pipe(res);
  }

  @Get(':id/hls/:segment')
  @ApiOperation({ summary: 'Get HLS segment' })
  @ApiResponse({ status: 200, description: 'TS segment for HLS streaming' })
  async getHlsSegment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('segment') segment: string,
    @Res() res: Response,
  ) {
    const media = await this.mediaService.getMedia(id);
    const segmentPath = `hls/${id}/${segment}`;
    const { stream } = await this.mediaService.getMediaStreamByIdentifier(segmentPath);
    res.setHeader('Content-Type', 'video/MP2T');
    stream.pipe(res);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a media file' })
  @ApiResponse({ status: 200, description: 'Media deleted successfully' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.mediaService.deleteMedia(id);
    return { success: true };
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Update media processing status (Internal)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'processing', 'ready', 'failed'] },
        metadata: { type: 'object' },
      },
    },
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string; metadata?: any },
  ) {
    return this.mediaService.updateStatus(id, body.status, body.metadata);
  }
}
