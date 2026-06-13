import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Lọc chỉ thông báo chưa đọc' })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;
}
