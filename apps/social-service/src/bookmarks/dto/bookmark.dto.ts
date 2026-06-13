import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BookmarkTarget {
  POST = 'post',
  REEL = 'reel',
  VIDEO = 'video',
  NOVEL = 'novel',
}

export class AddBookmarkDto {
  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: BookmarkTarget })
  @IsEnum(BookmarkTarget)
  targetType!: BookmarkTarget;
}

export class RemoveBookmarkDto {
  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: BookmarkTarget })
  @IsEnum(BookmarkTarget)
  targetType!: BookmarkTarget;
}

export class BookmarksQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  pageSize?: number = 20;

  @ApiPropertyOptional({ enum: BookmarkTarget })
  @IsOptional()
  @IsEnum(BookmarkTarget)
  type?: BookmarkTarget;
}
