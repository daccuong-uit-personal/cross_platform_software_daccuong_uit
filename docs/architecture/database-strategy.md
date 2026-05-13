# Database Selection & Strategy

Trong kiến trúc Microservices hiện đại, nguyên tắc quan trọng nhất là **Polyglot Persistence** (Chọn DB phù hợp nhất cho từng bài toán cụ thể).

## 📊 Chiến lược lựa chọn DB

| Domain | Database đề xuất | Lý do & Xu hướng công nghiệp |
| :--- | :--- | :--- |
| **Auth & Identity** | **PostgreSQL** | Yêu cầu tính nhất quán (ACID) cực cao, quan hệ dữ liệu chặt chẽ. |
| **Feed & Social Post** | **MongoDB** | Dữ liệu dạng Document, schema linh hoạt, hỗ trợ Write-heavy và Read-heavy tốt. Phổ biến cho Social. |
| **Comments & Reactions**| **MongoDB / Cassandra** | Dữ liệu phát triển cực nhanh, cần scale ngang (Sharding) dễ dàng. |
| **Shop & Orders** | **PostgreSQL** | Giao dịch tài chính cần tính toàn vẹn dữ liệu tuyệt đối. |
| **Media Metadata** | **PostgreSQL** | Dữ liệu metadata thường có cấu trúc cố định và liên quan chặt chẽ đến User. |
| **Real-time / Presence** | **Redis** | Tốc độ In-memory, phù hợp cho trạng thái online/offline, typing indicator. |
| **Search / Discovery** | **OpenSearch** | Full-text search, autocomplete, hashtag discovery hiệu quả hơn SQL/NoSQL. |
| **Analytics / Logs** | **ClickHouse** | OLAP database mạnh mẽ nhất cho việc xử lý hàng tỷ bản ghi (Creator Dashboard). |
| **Messaging (Chat)** | **MongoDB / ScyllaDB** | Lưu trữ lịch sử tin nhắn với throughput cao. |

---

## 🛠️ Chi tiết từng loại DB

### 1. PostgreSQL (The Primary Choice)
- **Khi nào dùng**: Mọi thứ liên quan đến Transaction, Tài chính, User Account.
- **Ưu điểm**: Hỗ trợ JSONB cực tốt (có thể thay thế Mongo ở quy mô vừa), Reliability số 1 hiện nay.
- **Các công ty sử dụng**: Uber, Netflix, Instagram.

### 2. MongoDB (The Social Choice)
- **Khi nào dùng**: Social Feed, Product Catalog, User Profile (dynamic fields), Chat History.
- **Ưu điểm**: Schema-less (linh hoạt khi thêm tính năng mới), Horizontal Scaling (Sharding) tích hợp sẵn.
- **Các công ty sử dụng**: Facebook (cho một số phần), Adobe, Forbes.

### 3. Redis (The Speed Layer)
- **Khi nào dùng**: Cache, Session, Rate Limiting, Real-time status.
- **Lưu ý**: Chỉ dùng cho dữ liệu tạm thời hoặc dữ liệu cần tốc độ truy cập microsecond.

### 4. ClickHouse (The Modern Analytics)
- **Khi nào dùng**: Theo dõi lượt view, tương tác của Creator, Log tập trung.
- **Ưu điểm**: Nhanh hơn 100-1000 lần so với Postgres/Mongo khi thực hiện các câu lệnh `GROUP BY` trên dữ liệu lớn.

---

## 🚦 Quy tắc quyết định (Decision Matrix)

1. **Có cần ACID Transaction liên quan đến tiền bạc không?**
   - Đúng -> **PostgreSQL**.
2. **Dữ liệu có cấu trúc không cố định và cần scale ngang nhanh không?**
   - Đúng -> **MongoDB**.
3. **Cần Search phức tạp hoặc gợi ý (Hashtag/User)?**
   - Đúng -> **OpenSearch**.
4. **Cần thống kê số liệu (Aggregation) trên hàng triệu bản ghi?**
   - Đúng -> **ClickHouse**.

---
*Lưu ý: Luôn bắt đầu với PostgreSQL nếu chưa chắc chắn, vì Postgres hiện nay rất đa năng (hỗ trợ cả JSON và Pub/Sub).*
