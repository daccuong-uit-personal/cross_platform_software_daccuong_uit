import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
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
    if (!media) throw new NotFoundException('Media not found');
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

  async updateStatus(id: string, status: string, metadata?: any): Promise<Media> {
    return this.prisma.media.update({
      where: { id },
      data: { 
        status,
        metadata: metadata ?? undefined
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

  async getMediaStreamByIdentifier(storagePath: string): Promise<{ stream: any }> {
    const stream = await this.storage.getFileStream(storagePath);
    return { stream };
  }
}
