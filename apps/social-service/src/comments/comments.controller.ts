import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto, ReportDto, PaginationQueryDto } from './dto/comment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Lấy danh sách comment của một post' })
  listByPost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.commentsService.listByPost(postId, query.page ?? 1, query.pageSize ?? 20);
  }

  @Post('posts/:postId/comments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm comment mới vào post' })
  create(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(postId, userId, dto);
  }

  @Put('comments/:commentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật comment' })
  update(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(commentId, userId, dto);
  }

  @Delete('comments/:commentId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa comment' })
  delete(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() userId: string,
  ) {
    return this.commentsService.delete(commentId, userId);
  }

  @Get('comments/:commentId/replies')
  @ApiOperation({ summary: 'Lấy replies của một comment' })
  getReplies(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.commentsService.getReplies(commentId, query.page ?? 1, query.pageSize ?? 20);
  }

  @Post('comments/:commentId/pin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ghim comment' })
  pin(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() userId: string,
  ) {
    return this.commentsService.pin(commentId, userId);
  }

  @Delete('comments/:commentId/pin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bỏ ghim comment' })
  unpin(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() userId: string,
  ) {
    return this.commentsService.unpin(commentId, userId);
  }

  @Post('comments/:commentId/report')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Báo cáo comment' })
  report(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() userId: string,
    @Body() dto: ReportDto,
  ) {
    return this.commentsService.report(commentId, userId, dto.reason, dto.description);
  }
}
