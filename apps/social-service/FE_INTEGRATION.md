# FE Integration Guide - Social Service

Tài liệu này tổng hợp các thông tin cần thiết để team Frontend (FE) tích hợp với API của `social-service`.

## 1. Modules Hiện Có

Hệ thống cung cấp các nhóm tính năng (modules) sau:
- **Users**: Hồ sơ cá nhân (Profile), Cài đặt (Privacy, Account), Block/Mute.
- **Follow**: Follow/Unfollow, danh sách Followers/Following, xử lý yêu cầu theo dõi (đối với private account).
- **Friendship**: Kết bạn, hủy kết bạn, đồng ý/từ chối lời mời, xem bạn chung, gợi ý kết bạn.
- **Posts**: Bảng tin (Feed/Discover), tạo/sửa/xóa bài viết (Text, Poll, Media), tương tác.
- **Comments**: Bình luận đa cấp (Reply), ghim bình luận.
- **Reactions**: Like, Love, Haha, Wow, Sad, Angry, Care cho Post/Reel/Video/Novel/Chapter/Comment.
- **Groups**: Tạo nhóm, tham gia nhóm, phân quyền (Admin/Moderator/Member), Feed nhóm.
- **Bookmarks**: Lưu nháp/đánh dấu nội dung (Post, Reel, Video, Novel).
- **Notifications**: Đọc/Xóa thông báo, đếm số thông báo chưa đọc.
- **Reels**: Video ngắn (TikTok/Instagram style), swipe feed, trending.
- **Videos**: Video dài (Youtube style), playlists, watch history (Continue Watching).
- **Novels**: Truyện chữ dài kỳ (Wattpad style), chapter reading progress, follow truyện, rate/review.
- **Hashtags**: Top trending hashtags, filter nội dung theo hashtag.
- **Search**: Tìm kiếm toàn cục đa thực thể (Global ILIKE search).
- **Analytics**: Lấy thống kê chung (views, impressions, engagements, watch time).

## 2. Conventions & Headers

### Authentication
Hệ thống sử dụng **API Gateway** làm lá chắn xác thực.
FE gửi token Bearer bình thường. Khi request lọt vào `social-service`, Gateway đã tự động parse JWT và tiêm header sau:
- **Header:** `X-User-ID`
- **Value:** UUID của người dùng hiện tại.

*Lưu ý: FE không truyền `X-User-ID` từ client. Client vẫn gửi `Authorization: Bearer <token>`. BE service tự hiểu qua Decorator `@CurrentUser()`.*

### Response Format chuẩn
Mọi API trả về đều được wrap bởi `TransformInterceptor` theo định dạng:
```json
{
  "statusCode": 200,
  "data": { ... } // Hoặc mảng [ ... ]
  "meta": { ... } // Optional
}
```

### Pagination Format
Khi query danh sách (list), FE truyền query params: `?page=1&pageSize=20`.
Dữ liệu trả về sẽ có block `meta.pagination`:
```json
{
  "statusCode": 200,
  "data": [ ... ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 95,
      "itemsPerPage": 20,
      "hasNext": true
    }
  }
}
```

### Error Response Format
Tuân chuẩn HTTP Status Code. Body trả về từ `ExceptionFilter`:
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Tiểu thuyết không tồn tại"
}
```
*Lưu ý: Các `message` lỗi đa số đã được Việt hóa theo contract (VD: "Không có quyền truy cập", "Đã lưu thành công").*

## 3. Các Endpoint Chính Thường Dùng

- **Feed / Discover**:
  - `GET /posts/feed` (Bảng tin bài viết của bạn bè/người theo dõi)
  - `GET /reels/discover?filter=for-you` (Cuộn video ngắn)
- **Tương tác**:
  - `POST /reactions` (body: `{ targetId, targetType: 'post'|'reel'..., type: 'LIKE' }`)
  - `POST /comments/:postId/comments`
- **Analytics Track (Quan trọng)**:
  - Để đo Watch Time của Reel/Video: `POST /analytics/watch-time` body `{ targetId, targetType, watchTimeSeconds }`. Gọi định kỳ (VD: 5s 1 lần) để BE cộng dồn thời gian xem.
- **Library/History**:
  - `GET /videos/me/history` (Continue watching videos)
  - `GET /novels/me/library` (Tủ sách đang đọc dở)
  - `PUT /novels/:novelId/chapters/:chapterId/progress` (Ghi nhận % cuộn chuột của chapter)

## 4. Lưu Ý Tích Hợp
- **Counter Cache:** Số lượng Like, Comment, View (`likeCount`, `viewCount`) đi kèm cùng chi tiết bài viết. Khi FE thực hiện Like, BE sẽ trả về `likeCount` mới nhất, FE tự cập nhật UI state mà không cần fetch lại toàn bộ.
- **Fire & Forget View Tracking:** Endpoint `GET /videos/:videoId` hoặc `GET /novels/:novelId` tự động tăng View ẩn bên dưới BE. FE không cần gọi thêm API tăng view.
- **Soft Delete:** Hầu hết dữ liệu bị xóa sẽ được gỡ khỏi Feed (`isDeleted: true`), nhưng nếu gọi bằng ID trực tiếp có thể trả 404. Phía FE cần handle lỗi 404 gọn gàng (VD hiển thị: "Nội dung này không còn khả dụng").
