import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [StorageModule, PrismaModule, JobsModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
