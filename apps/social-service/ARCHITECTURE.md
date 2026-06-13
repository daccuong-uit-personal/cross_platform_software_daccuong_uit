# Architecture & Decisions - Social Service

Tài liệu này ghi chú lại các quyết định thiết kế kiến trúc, trade-off, và hướng đi cho các phase tiếp theo của `social-service`.

## 1. Architectural Decisions

- **Framework & ORM:** NestJS (Fastify) + Prisma. Ưu tiên Type-Safety tuyệt đối từ DB schema đến Controller DTOs.
- **Frontend-First (Driven by Contract):** Toàn bộ API Controller, Naming convention và Pagination schema được thiết kế khớp chặt chẽ với hợp đồng `mock-api-specs.yaml` mà team FE đã đưa ra.
- **Denormalization (Counters Cache):** PostgreSQL lưu trữ các counters `likeCount`, `commentCount`, `viewCount`, `shareCount` ở các bảng cha (`Post`, `Reel`, `Video`, `Novel`).
  - *Lý do:* Tăng tốc độ đọc (Read-heavy) ở các feed. Tránh query `SELECT COUNT(*)` mỗi khi load feed.
  - *Thực thi:* Dùng `prisma.$transaction` cho mọi tác vụ Insert/Delete gây biến động counter.
- **Fire & Forget View/Analytics:** Endpoint lấy chi tiết (detail) bài viết tự động kích hoạt tiến trình tăng `viewCount` bất đồng bộ (Catch lỗi độc lập), không block luồng trả response cho FE.
- **Global Indexing Strategy:** 
  - Toàn bộ feed query được hậu thuẫn bởi Composite Indexes: `@@index([visibility, createdAt(sort: Desc)])` hoặc `@@index([authorId, createdAt(sort: Desc)])`.
  - Mọi bảng cross-relation (VD: `Follow`, `Reaction`, `Bookmark`, `WatchHistory`) đều sử dụng `@@unique([userId, targetId])` để đảm bảo idempotent và tránh race condition.

## 2. Current Trade-offs

- **PostgreSQL vs Redis cho Counters:** 
  - Hiện tại, tương tác (Like, WatchTime) đang đập thẳng vào DB (DB-write-heavy). Với scale nhỏ/vừa, PostgreSQL transaction đủ sức cân. Nhưng khi xảy ra "Viral Content" (hàng chục nghìn tương tác/phút), DB sẽ dính Row-Level Lock.
  - *Trade-off:* Chọn sự đơn giản (Code dễ đọc, không cần duy trì worker rườm rà) thay vì over-engineering từ Phase 2.
- **Trending & Feed Discovery:**
  - `Discover Feed` và `Trending Hashtags` đang dùng lệnh `ORDER BY score/likeCount DESC, createdAt DESC`. Phép tính toán này thực hiện runtime.
  - *Trade-off:* Kết quả real-time chính xác nhưng sẽ không thể scale nếu bảng có hàng chục triệu row.
- **Global Search:**
  - Dùng PostgreSQL `ILIKE` để search toàn cục.
  - *Trade-off:* Không có Full-Text Search (FTS) xịn, độ trễ cao, khó phân tích ngữ nghĩa, không hỗ trợ typo.

## 3. Known Issues

- Logic tính điểm `AverageRating` của Novel sử dụng `aggregate` mỗi lần user rate. Gây lock và chậm nếu rate count lớn.
- Bảng `WatchHistory` lưu lịch sử xem video của mọi user sẽ phình to không giới hạn.
- Logic Fanout On Read của `Following Feed` (Lấy list user đang follow rồi IN (...)) chỉ hoạt động tốt nếu user follow dưới 2.000 người. Nếu follow 50.000 người, DB query sẽ timeout.

## 4. Deferred Features (Chưa làm / Bỏ qua Phase 2)

- Recommendation Engine (Gợi ý For-You thực thụ dựa trên hành vi).
- Caching API Payload (Redis Response Cache).
- Data Archival (Chuyển dữ liệu cũ sang cold storage).
- Các API báo cáo xấu (Moderation Queue) chưa tích hợp backend admin.

## 5. Định hướng Phase tiếp theo

- **Phase 3 (Realtime):** Kết nối `social-service` events qua Message Queue -> WebSocket Gateway để bắn Realtime Notification / Live Like count.
- **Phase 4 (Kafka & Redis Buffer):** Tách toàn bộ logic đếm Like, View, WatchTime ra khỏi request chính. Frontend ném event -> Kafka -> Social Worker Update DB mỗi 5 phút.
- **Phase 5 (Search Engine):** Gỡ `ILIKE` PostgreSQL, đồng bộ dữ liệu `Post`, `Video`, `Reel`, `Hashtag` lên **OpenSearch/ElasticSearch** để build Search Engine cực mạnh.
