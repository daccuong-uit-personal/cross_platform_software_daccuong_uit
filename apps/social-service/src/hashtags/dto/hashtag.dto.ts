import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum HashtagContentType {
  POST = 'post',
  REEL = 'reel',
  VIDEO = 'video',
  ALL = 'all',
}

export class HashtagsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  pageSize?: number = 20;
}

export class HashtagContentQueryDto extends HashtagsQueryDto {
  @ApiPropertyOptional({ enum: HashtagContentType, default: HashtagContentType.ALL })
  @IsOptional()
  @IsEnum(HashtagContentType)
  type?: HashtagContentType = HashtagContentType.ALL;
}
