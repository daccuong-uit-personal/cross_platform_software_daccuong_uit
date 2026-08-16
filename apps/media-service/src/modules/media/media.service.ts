import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Media } from '@prisma/client-media';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue('media-processing') private readonly mediaQueue: Queue,
  ) {}

  async createMedia(userId: string, file: Express.Multer.File): Promise<Media> {
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const fileName = `${fileId}${ext}`;
    
    // 1. Upload to MinIO
    await this.storage.uploadFile(fileName, file.buffer, file.size, file.mimetype);

    // 2. Save to DB
    const media = await this.prisma.media.create({
      data: {
        id: fileId,
        file_name: fileName,
        original_name: file.originalname,
        mime_type: file.mimetype,
        file_size: BigInt(file.size),
        storage_path: fileName,
        user_id: userId,
        status: 'pending', // Change to pending for background processing
      },
    });

    // 3. Add to processing queue
    await this.mediaQueue.add('process', {
      mediaId: media.id,
      storagePath: media.storage_path,
      mimeType: media.mime_type,
    });

    return media;
  }

  async createPresignedUpload(userId: string, originalName: string, mimeType: string, fileSize: number): Promise<{ mediaId: string; uploadUrl: string }> {
    const fileId = uuidv4();
    const ext = path.extname(originalName) || (mimeType.includes('/') ? `.${mimeType.split('/')[1]}` : '.bin');
    const fileName = `${fileId}${ext}`;

    const uploadUrl = await this.storage.getPresignedPutUrl(fileName, mimeType, 3600);

    const media = await this.prisma.media.create({
      data: {
        id: fileId,
        file_name: fileName,
        original_name: originalName,
        mime_type: mimeType,
        file_size: BigInt(fileSize),
        storage_path: fileName,
        user_id: userId,
        status: 'pending',
      },
    });

    return { mediaId: media.id, uploadUrl };
  }

  async completeUpload(mediaId: string): Promise<Media> {
    const media = await this.getMedia(mediaId);
    
    // Verify file actually exists on MinIO
    const stat = await this.storage.statObject(media.storage_path);
    
    // Update real file size from MinIO and change status to processing
    const updatedMedia = await this.prisma.media.update({
      where: { id: mediaId },
      data: { 
        status: 'processing',
        file_size: BigInt(stat.size)
      },
    });

    await this.mediaQueue.add('process', {
      mediaId: updatedMedia.id,
      storagePath: updatedMedia.storage_path,
      mimeType: updatedMedia.mime_type,
    });

    return updatedMedia;
  }

  async uploadBase64(userId: string, base64: string, originalName: string): Promise<Media> {
    const buffer = Buffer.from(base64, 'base64');
    const mimeType = 'application/octet-stream'; // Ideally, extract from base64 if it has header
    
    // Simple way to handle data:image/png;base64,...
    let cleanBase64 = base64;
    let detectedMime = mimeType;
    if (base64.startsWith('data:')) {
      const parts = base64.split(';base64,');
      detectedMime = parts[0].replace('data:', '');
      cleanBase64 = parts[1];
    }
    
    const finalBuffer = Buffer.from(cleanBase64, 'base64');
    const fileId = uuidv4();
    const ext = path.extname(originalName) || `.${detectedMime.split('/')[1]}`;
    const fileName = `${fileId}${ext}`;

    await this.storage.uploadFile(fileName, finalBuffer, finalBuffer.length, detectedMime);

    const media = await this.prisma.media.create({
      data: {
        id: fileId,
        file_name: fileName,
        original_name: originalName,
        mime_type: detectedMime,
        file_size: BigInt(finalBuffer.length),
        storage_path: fileName,
        user_id: userId,
        status: 'pending',
      },
    });

    await this.mediaQueue.add('process', {
      mediaId: media.id,
      storagePath: media.storage_path,
      mimeType: media.mime_type,
    });

    return media;
  }

  async createMediaFromStream(
    userId: string,
    stream: any,
    originalName: string,
    mimeType: string,
    size?: number,
  ): Promise<Media> {
    const fileId = uuidv4();
    const ext = path.extname(originalName) || '.bin';
    const fileName = `${fileId}${ext}`;

    // 1. Upload Stream to MinIO
    await this.storage.uploadStream(fileName, stream, size, mimeType);

    // 2. Save to DB
    const media = await this.prisma.media.create({
      data: {
        id: fileId,
        file_name: fileName,
        original_name: originalName,
        mime_type: mimeType,
        file_size: size ? BigInt(size) : BigInt(0),
        storage_path: fileName,
        user_id: userId,
        status: 'pending',
      },
    });

    // 3. Add to processing queue
    await this.mediaQueue.add('process', {
      mediaId: media.id,
      storagePath: media.storage_path,
      mimeType: media.mime_type,
    });

    return media;
  }

  async listMedia(query: {
    userId?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<Media[]> {
    const where: any = {};

    if (query.userId) {
      where.user_id = query.userId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      if (query.type === 'image' || query.type === 'video' || query.type === 'audio') {
        where.mime_type = { startsWith: `${query.type}/` };
      } else if (query.type === 'file') {
        where.NOT = [
          { mime_type: { startsWith: 'image/' } },
          { mime_type: { startsWith: 'video/' } },
          { mime_type: { startsWith: 'audio/' } },
        ];
      }
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    return this.prisma.media.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });
  }

  async getStatus(id: string): Promise<{ id: string; status: string; metadata: any; mime_type: string; created_at: Date } > {
    const media = await this.getMedia(id);
    return {
      id: media.id,
      status: media.status,
      metadata: media.metadata,
      mime_type: media.mime_type,
      created_at: media.created_at,
    };
  }

  async getPreview(id: string): Promise<any> {
    const media = await this.getMedia(id);
    const metadata = media.metadata as any;
    const downloadUrl = await this.getDownloadUrl(id);

    return {
      id: media.id,
      fileName: media.file_name,
      originalName: media.original_name,
      mimeType: media.mime_type,
      fileSize: media.file_size.toString(),
      status: media.status,
      thumbnailPath: metadata?.thumbnail || null,
      hlsPath: metadata?.hls_path || null,
      processedPath: metadata?.processed_path || null,
      metadata: metadata || {},
      downloadUrl,
      createdAt: media.created_at,
    };
  }

  async reprocessMedia(id: string): Promise<Media> {
    const media = await this.getMedia(id);
    const updated = await this.updateStatus(id, 'pending');
    await this.mediaQueue.add('process', {
      mediaId: media.id,
      storagePath: media.storage_path,
      mimeType: media.mime_type,
    });
    return updated;
  }

  async getMedia(id: string): Promise<Media> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Không tìm thấy tệp media');
    return media;
  }

  async getDownloadUrl(id: string): Promise<string> {
    const media = await this.getMedia(id);
    return this.storage.getPresignedUrl(media.storage_path);
  }

  async deleteMedia(id: string): Promise<void> {
    const media = await this.getMedia(id);
    
    // 1. Delete from MinIO
    await this.storage.deleteFile(media.storage_path);

    // 2. Delete from DB
    await this.prisma.media.delete({ where: { id } });
  }

  async updateStatus(id: string, status: string, metadata?: any, thumbnail_path?: string): Promise<Media> {
    return this.prisma.media.update({
      where: { id },
      data: { 
        status,
        metadata: metadata ?? undefined,
        thumbnail_path: thumbnail_path ?? undefined
      },
    });
  }

  async getMediaStream(id: string): Promise<{ stream: any; mimeType: string; originalName: string; size: number }> {
    const media = await this.getMedia(id);
    const stream = await this.storage.getFileStream(media.storage_path);
    return {
      stream,
      mimeType: media.mime_type,
      originalName: media.original_name,
      size: Number(media.file_size),
    };
  }

  /**
   * Get a partial stream of a media file for HTTP Range requests.
   * Returns the partial MinIO stream together with resolved byte range info.
   */
  async getMediaStreamRange(
    id: string,
    rangeHeader: string | undefined,
  ): Promise<{
    stream: any;
    mimeType: string;
    originalName: string;
    totalSize: number;
    start: number;
    end: number;
    chunkSize: number;
    isPartial: boolean;
  }> {
    const media = await this.getMedia(id);
    const totalSize = Number(media.file_size);

    // ─── Parse Range header ────────────────────────────────────────────────────
    if (!rangeHeader) {
      // No Range → full object, 200
      const stream = await this.storage.getFileStream(media.storage_path);
      return {
        stream,
        mimeType: media.mime_type,
        originalName: media.original_name,
        totalSize,
        start: 0,
        end: totalSize - 1,
        chunkSize: totalSize,
        isPartial: false,
      };
    }

    const parsed = this.parseRangeHeader(rangeHeader, totalSize);
    const { start, end } = parsed;
    const chunkSize = end - start + 1;

    const stream = await this.storage.getFileStreamRange(media.storage_path, start, chunkSize);

    return {
      stream,
      mimeType: media.mime_type,
      originalName: media.original_name,
      totalSize,
      start,
      end,
      chunkSize,
      isPartial: true,
    };
  }

  /**
   * Parse "bytes=start-end" / "bytes=start-" / "bytes=-suffix" into { start, end }.
   * Throws with status 416 if the range is unsatisfiable.
   */
  parseRangeHeader(rangeHeader: string, totalSize: number): { start: number; end: number } {
    const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
    if (!match) {
      const err: any = new Error('Invalid Range header');
      err.status = 416;
      throw err;
    }

    const rawStart = match[1];
    const rawEnd = match[2];

    let start: number;
    let end: number;

    if (rawStart === '' && rawEnd !== '') {
      // bytes=-suffixLength  →  last N bytes
      const suffix = parseInt(rawEnd, 10);
      start = Math.max(0, totalSize - suffix);
      end = totalSize - 1;
    } else if (rawStart !== '' && rawEnd === '') {
      // bytes=start-  →  from start to EOF
      start = parseInt(rawStart, 10);
      end = totalSize - 1;
    } else {
      // bytes=start-end
      start = parseInt(rawStart, 10);
      end = parseInt(rawEnd, 10);
    }

    // Validate
    if (
      isNaN(start) ||
      isNaN(end) ||
      start > end ||
      start >= totalSize ||
      end >= totalSize
    ) {
      const err: any = new Error('Range Not Satisfiable');
      err.status = 416;
      throw err;
    }

    return { start, end };
  }

  async getMediaStreamByIdentifier(storagePath: string): Promise<{ stream: any }> {
    const stream = await this.storage.getFileStream(storagePath);
    return { stream };
  }
}
