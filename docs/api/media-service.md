# Media Service API

## Mục tiêu
Tài liệu này mô tả các endpoint của Media Service, gồm upload, polling trạng thái, preview, HLS streaming và các thao tác xử lý lại.

---

## Định danh cơ bản
- Base path: `/v1/media` (gateway)
- Trong service nội bộ: `/media`
- Các status chính:
  - `pending` - chờ worker xử lý
  - `processing` - worker đang xử lý
  - `ready` - media đã sẵn sàng
  - `failed` - xử lý thất bại

---

## Endpoint chính

### 1. Upload Multipart
- `POST /v1/media/upload`
- Body: `multipart/form-data`
- Trường:
  - `file` (binary)
  - `userId` (string, tùy chọn)
- Header:
  - `Authorization: Bearer ...`

Kết quả trả về:
- `id`, `fileName`, `originalName`, `mimeType`, `fileSize`, `status`, `createdAt`

---

### 2. Upload Base64
- `POST /v1/media/upload-base64`
- Header: `Content-Type: application/json`
- Body JSON:
```json
{
  "base64": "data:image/png;base64,...",
  "originalName": "avatar.png",
  "userId": "..."
}
```

---

### 3. Upload Stream
- `POST /v1/media/upload-stream`
- Body: raw binary
- Headers:
  - `x-original-name`: tên file gốc
  - `content-type`
  - `content-length` (nếu có)
  - `Authorization: Bearer ...`

---

### 4. List media
- `GET /v1/media`
- Query params:
  - `userId` (optional)
  - `status` (optional)
  - `type` (optional): `image`, `video`, `audio`, `file`
  - `page` (optional)
  - `limit` (optional)

Response:
- `items`: danh sách media
- `page`, `limit`, `count`

---

### 5. Get media status
- `GET /v1/media/:id/status`

Response:
- `id`, `status`, `metadata`, `mime_type`, `created_at`

---

### 6. Get preview info
- `GET /v1/media/:id/preview`

Response:
- `id`, `fileName`, `originalName`, `mimeType`, `fileSize`, `status`
- `thumbnailPath`, `hlsPath`, `processedPath`
- `metadata`
- `downloadUrl`
- `createdAt`

---

### 7. Get metadata
- `GET /v1/media/:id`

---

### 8. Download URL
- `GET /v1/media/:id/download`
- Trả URL tạm để tải trực tiếp từ MinIO

---

### 9. Stream media
- `GET /v1/media/:id/stream`
- Trả raw body file với `Content-Type` và `Accept-Ranges`

---

### 10. Thumbnail
- `GET /v1/media/:id/thumbnail`
- Trả thumbnail image nếu đã tạo xong

---

### 11. HLS streaming
- `GET /v1/media/:id/hls/index.m3u8`
- `GET /v1/media/:id/hls/:segment`

Đây là cách FE playback HLS khi media video đã qua xử lý.

---

### 12. Reprocess media
- `POST /v1/media/:id/reprocess`
- Header: `Authorization: Bearer ...`
- Dùng khi media đã `failed` hoặc cần xử lý lại

---

## Flow xử lý

1. FE upload file.
2. Media service lưu file lên MinIO và tạo record DB `pending`.
3. Media service đẩy job vào queue Redis/Bull.
4. Worker Python đọc queue từ Redis và bắt đầu xử lý.
5. Worker cập nhật trạng thái `processing`.
6. Worker tạo thumbnail/HLS/audio-processed nếu cần.
7. Worker gọi service nội bộ để cập nhật `status: ready` hoặc `failed`.
8. FE poll `GET /v1/media/:id/status` hoặc `GET /v1/media/:id/preview` để biết kết quả.

---

## Gợi ý sử dụng cho FE

- Dùng `GET /v1/media/:id/status` để poll trạng thái.
- Dùng `GET /v1/media/:id/preview` để nhận data preview và link tải.
- Dùng `GET /v1/media/:id/hls/index.m3u8` khi upload video và muốn playback HLS.
- Dùng `GET /v1/media/:id/thumbnail` để hiển thị preview thumbnail khi có.
- Dùng `POST /v1/media/:id/reprocess` khi cần chạy lại job.
