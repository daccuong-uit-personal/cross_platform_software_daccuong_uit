import { Controller, Post, Get, Delete, Param, Req, Body, Res, Query, UseGuards } from '@nestjs/common';
import { HttpProxyService } from '../common/services/http-proxy.service';
import { appConfig } from '../config/app.config';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiHeader, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('media')
@Controller('v1/media')
export class MediaProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a media file (Multipart)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async upload(@Req() req: any) {
    const data = await req.file();
    if (!data) {
      return { message: 'No file uploaded' };
    }

    const userId = req.user?.sub || '00000000-0000-0000-0000-000000000000';
    const formData = new FormData();
    const buffer = await data.toBuffer();
    const blob = new Blob([buffer], { type: data.mimetype });
    formData.append('file', blob, data.filename);
    formData.append('userId', userId);

    return this.proxy.forward('POST', `${appConfig.MEDIA_SERVICE_URL}/media/upload`, {
      body: formData,
      isFormData: true,
      headers: {
        'x-user-id': userId,
      },
    });
  }

  @Post('upload-base64')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a media file (Base64)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        base64: { type: 'string' },
        originalName: { type: 'string' },
      },
    },
  })
  async uploadBase64(@Body() body: any, @Req() req: any) {
    const userId = req.user?.sub || '00000000-0000-0000-0000-000000000000';
    return this.proxy.forward('POST', `${appConfig.MEDIA_SERVICE_URL}/media/upload-base64`, {
      body: { ...body, userId },
      headers: {
        'x-user-id': userId,
      },
    });
  }

  @Post('upload-stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a media file (Stream)' })
  @ApiHeader({ name: 'x-original-name', description: 'Original file name', required: true })
  @ApiBody({ schema: { type: 'string', format: 'binary' }, description: 'Binary file content' })
  async uploadStream(@Req() req: any, @Res() res: any) {
    const userId = req.user?.sub || '00000000-0000-0000-0000-000000000000';
    const url = `${appConfig.MEDIA_SERVICE_URL}/media/upload-stream`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-original-name': req.headers['x-original-name'],
        'x-user-id': userId,
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
      },
      body: req.raw, // Fastify raw stream
      duplex: 'half',
    } as any);

    const data = await response.json();
    res.status(response.status).send(data);
  }

  @Get()
  @ApiOperation({ summary: 'List media items' })
  @ApiQuery({ name: 'userId', required: false, type: 'string' })
  @ApiQuery({ name: 'status', required: false, type: 'string', enum: ['pending', 'processing', 'ready', 'failed'] })
  @ApiQuery({ name: 'type', required: false, type: 'string', enum: ['image', 'video', 'audio', 'file'] })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  async listMedia(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const url = new URL(`${appConfig.MEDIA_SERVICE_URL}/media`);
    if (userId) url.searchParams.set('userId', userId);
    if (status) url.searchParams.set('status', status);
    if (type) url.searchParams.set('type', type);
    if (page) url.searchParams.set('page', page);
    if (limit) url.searchParams.set('limit', limit);

    return this.proxy.forward('GET', url.toString());
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get media processing status' })
  async getStatus(@Param('id') id: string) {
    return this.proxy.forward('GET', `${appConfig.MEDIA_SERVICE_URL}/media/${id}/status`);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Get media preview info' })
  async getPreview(@Param('id') id: string) {
    return this.proxy.forward('GET', `${appConfig.MEDIA_SERVICE_URL}/media/${id}/preview`);
  }

  @Post(':id/reprocess')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reprocess media file' })
  async reprocessMedia(@Param('id') id: string) {
    return this.proxy.forward('POST', `${appConfig.MEDIA_SERVICE_URL}/media/${id}/reprocess`);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check Media Service health' })
  getHealth() {
    return this.proxy.forward('GET', `${appConfig.MEDIA_SERVICE_URL}/health`);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media metadata' })
  @ApiResponse({ status: 200, description: 'Media metadata' })
  async getMetadata(@Param('id') id: string) {
    return this.proxy.forward('GET', `${appConfig.MEDIA_SERVICE_URL}/media/${id}`);
  }

  @Get(':id/base64')
  @ApiOperation({ summary: 'Get media as Base64' })
  async getBase64(@Param('id') id: string) {
    return this.proxy.forward('GET', `${appConfig.MEDIA_SERVICE_URL}/media/${id}/base64`);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Get raw media file' })
  async getFile(@Param('id') id: string, @Res() res: any) {
    return this.proxy.pipeForward(`${appConfig.MEDIA_SERVICE_URL}/media/${id}/stream`, res);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get presigned download URL' })
  async getDownloadUrl(@Param('id') id: string) {
    return this.proxy.forward('GET', `${appConfig.MEDIA_SERVICE_URL}/media/${id}/download`);
  }

  @Get(':id/thumbnail')
  @ApiOperation({ summary: 'Get media thumbnail' })
  async getThumbnail(@Param('id') id: string, @Res() res: any) {
    return this.proxy.pipeForward(`${appConfig.MEDIA_SERVICE_URL}/media/${id}/thumbnail`, res);
  }

  @Get(':id/info')
  @ApiOperation({ summary: 'Get detailed media info (metadata)' })
  async getInfo(@Param('id') id: string) {
    return this.proxy.forward('GET', `${appConfig.MEDIA_SERVICE_URL}/media/${id}/info`);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream media file' })
  @ApiResponse({ status: 200, description: 'Binary stream' })
  async streamFile(@Param('id') id: string, @Res() res: any) {
    return this.proxy.pipeForward(`${appConfig.MEDIA_SERVICE_URL}/media/${id}/stream`, res);
  }

  @Get(':id/hls/index.m3u8')
  @ApiOperation({ summary: 'Get HLS playlist' })
  async getHlsPlaylist(@Param('id') id: string, @Res() res: any) {
    return this.proxy.pipeForward(`${appConfig.MEDIA_SERVICE_URL}/media/${id}/hls/index.m3u8`, res);
  }

  @Get(':id/hls/:segment')
  @ApiOperation({ summary: 'Get HLS segment' })
  async getHlsSegment(@Param('id') id: string, @Param('segment') segment: string, @Res() res: any) {
    return this.proxy.pipeForward(`${appConfig.MEDIA_SERVICE_URL}/media/${id}/hls/${segment}`, res);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media' })
  async deleteMedia(@Param('id') id: string) {
    return this.proxy.forward('DELETE', `${appConfig.MEDIA_SERVICE_URL}/media/${id}`);
  }
}
