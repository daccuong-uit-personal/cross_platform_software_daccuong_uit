import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  pageSize?: number = 20;
}

export class FriendSuggestionsQueryDto {
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  limit?: number = 10;
}
