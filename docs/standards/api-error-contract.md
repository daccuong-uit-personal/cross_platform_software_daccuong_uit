# API Response Contract (Thống nhất giữa Frontend và Backend)

## Mục đích
Tài liệu này định nghĩa cấu trúc trả về thống nhất cho toàn bộ các API trong hệ thống. Mọi Backend API **bắt buộc phải tuân thủ** contract này để đảm bảo Frontend và Backend giao tiếp mượt mà, dễ dàng parse dữ liệu và tự động hóa việc hiển thị thông báo/báo lỗi.

---

## 1. Cấu Trúc Response Thành Công (Success Response)

Mọi API xử lý thành công (HTTP 200, 201) phải trả về cùng một bộ khung (wrapper):

```json
{
  "statusCode": 200,
  "message": "Đăng nhập thành công",
  "data": {
    "accountId": "d4cbfa32-4c39...",
    "accessToken": "eyJhbG..."
  },
  "meta": {
    "timestamp": "2026-05-16T12:00:00.000Z",
    "path": "/v1/auth/login"
  }
}
```

### Chi tiết các trường Success Response:

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `statusCode` | `number` | ✅ | Mã HTTP (200, 201, v.v.) - **PHẢI TRÙNG** với HTTP Status Code thực tế |
| `message` | `string` | ❌ | Tin nhắn thành công (tùy chọn). Frontend có thể dùng để hiển thị Toast |
| `data` | `object` \| `array` | ✅ | Dữ liệu core - **TUYỆT ĐỐI TRÁNH** double wrapping |
| `meta` | `object` | ❌ | Metadata phụ hoặc tracing (tùy chọn) |

---

## 2. Cấu Trúc Phân trang (Pagination Standard)

Đối với các API lấy danh sách, `data` là mảng, thông tin phân trang trong `meta.pagination`:

```json
{
  "statusCode": 200,
  "data": [
    { "id": "1", "title": "Post 1" },
    { "id": "2", "title": "Post 2" }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10,
      "hasNext": true
    },
    "timestamp": "2026-05-16T12:05:00.000Z"
  }
}
```

---

## 3. Cấu Trúc Response Lỗi Tiêu Chuẩn (Error Response)

Mọi lỗi từ Backend (HTTP 400, 401, 403, 404, 500...) phải tuân thủ format sau:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Thông tin đầu vào không hợp lệ",
  "path": "/v1/auth/register",
  "timestamp": "2026-05-16T12:00:00.000Z",
  "errors": {
    "email": ["Email đã tồn tại trong hệ thống", "Email không đúng định dạng"],
    "password": ["Mật khẩu phải dài hơn 8 ký tự"]
  }
}
```

### Chi tiết các trường Error Response:

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `statusCode` | `number` | ✅ | Mã lỗi HTTP (400, 401, 403, 404, 500, v.v.) - **PHẢI TRÙNG** với HTTP Status Code |
| `error` | `string` | ✅ | Tên của HTTP Status, ví dụ: "Bad Request", "Unauthorized", "Not Found" |
| `message` | `string` | ✅ | Tin nhắn **thân thiện** để hiển thị trên Toast |
| `path` | `string` | ✅ | Đường dẫn API bị lỗi |
| `timestamp` | `string` | ✅ | Thời gian lỗi (ISO 8601 format) |
| `errors` | `object` | ❌ | Tuỳ chọn, chỉ cho validation errors (HTTP 400) |

### Định dạng `errors` field (Validation Errors)

Khi có lỗi validation, trường `errors` là Object Map:
- **Key**: Tên trường form
- **Value**: Mảng lỗi cho trường đó

```json
{
  "errors": {
    "email": [
      "Email đã tồn tại trong hệ thống",
      "Email không đúng định dạng"
    ],
    "password": [
      "Mật khẩu phải dài hơn 8 ký tự"
    ]
  }
}
```

## 4. Quy Tắc Bắt buộc (Global Rules for All APIs)

### 4.1 Không bọc Data 2 lớp (No Double Wrapping)
Frontend đã thiết kế Global Interceptor để lột vỏ ngoài cùng lấy `data` ra dùng. **Tuyệt đối không được** bọc 2 lần (`data.data`), nếu không FE sẽ mất dữ liệu.

```javascript
❌ SAI: 
{
  "statusCode": 200,
  "data": {
    "data": { "accountId": "...", "accessToken": "..." }  // DOUBLE WRAPPING!
  }
}

✅ ĐÚNG:
{
  "statusCode": 200,
  "data": {
    "accountId": "...",
    "accessToken": "..."
  }
}
```

### 4.2 StatusCode phải TRÙNG HTTP Status Code
Field `statusCode` trong JSON body **PHẢI TRÙNG KHỚP** với HTTP Status Code thực tế. Tuyệt đối không được trả HTTP 200 nhưng ghi `statusCode: 400`.

```javascript
❌ SAI: HTTP 200 + statusCode: 400
❌ SAI: HTTP 400 + statusCode: 500

✅ ĐÚNG: HTTP 200 + statusCode: 200
✅ ĐÚNG: HTTP 400 + statusCode: 400
```

### 4.3 Error Name phải khớp HTTP Status Code
```javascript
❌ SAI: HTTP 400 + error = "InternalServerError"
❌ SAI: HTTP 401 + error = "Bad Request"

✅ ĐÚNG: HTTP 400 + error = "Bad Request"
✅ ĐÚNG: HTTP 401 + error = "Unauthorized"
```

### 4.4 Message phải thân thiện với người dùng (User-Friendly)
- Message là `string` (không array, không null)
- Viết bằng **Tiếng Việt**, câu văn hoàn chỉnh
- Frontend sẽ **bê nguyên** text này vào Toast góc màn hình

```javascript
✅ ĐÚNG:
- "Email đã tồn tại trong hệ thống"
- "Email hoặc mật khẩu không chính xác"
- "Tài khoản của bạn đã bị khóa"
- "Vui lòng nhập đúng định dạng email"

❌ SAI:
- "Invalid email format"
- "AUTH_INVALID_CREDENTIALS"
- "VALIDATION_ERROR"
- "500 Internal Server Error"
- Stack trace, exception details
```

### 4.5 Validation Errors - Dùng `errors` field
Chỉ sử dụng `errors` field khi **HTTP 400 + validation lỗi**. Mỗi field có thể có nhiều lỗi (array of strings). Frontend tự động tô đỏ viền ô Input tương ứng.

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Thông tin đầu vào không hợp lệ",
  "errors": {
    "email": ["Email không đúng định dạng", "Email đã tồn tại"],
    "password": ["Mật khẩu phải dài hơn 8 ký tự"]
  }
}
---

## 5. Bảng Ánh Xạ HTTP Status Code → Error Name

| HTTP Code | Error Name | Khi nào dùng |
|-----------|-----------|------------|
| 400 | Bad Request | Validation errors, invalid input |
| 401 | Unauthorized | Missing/invalid token, invalid credentials |
| 403 | Forbidden | User không có quyền truy cập resource |
| 404 | Not Found | Resource không tồn tại |
| 409 | Conflict | Resource đã tồn tại (email, username đã được dùng) |
| 422 | Unprocessable Entity | Dữ liệu hợp lệ nhưng không thể xử lý |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Lỗi phía server không lường trước |
| 502 | Bad Gateway | Upstream service lỗi |
| 503 | Service Unavailable | Server bảo trì hoặc quá tải |

## 6. Luồng Xử Lý Ở Frontend

### Khi User nhấn Submit form Register và Backend báo lỗi:

```
1. User nhấn Submit form
   ↓
2. Frontend gửi request POST /auth/register
   ↓
3. Backend trả lỗi 400 với body:
   {
     "statusCode": 400,
     "error": "Bad Request",
     "message": "Thông tin đầu vào không hợp lệ",
     "errors": {
       "email": ["Email đã tồn tại"],
       "password": ["Mật khẩu quá ngắn"]
     }
   }
   ↓
4. Frontend Global Interceptor bắt error:
   - Đọc error.message → Hiển thị Toast "Thông tin đầu vào không hợp lệ"
   - Đọc error.errors → Tô đỏ ô Email, ô Password với pesan lỗi tương ứng
```

## 7. Ví Dụ Error (Tham khảo)

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Thông tin đầu vào không hợp lệ",
  "path": "/v1/auth/register",
  "timestamp": "2026-05-16T10:30:00.000Z",
  "errors": {
    "email": ["Email không đúng định dạng"]
  }
}
```

## 8. Implementation Checklist

### Backend Developer
- [ ] **Success Responses**: Luôn trả `statusCode`, `data`, và tuân thủ format wrapper
- [ ] **No Double Wrapping**: Tuyệt đối không bọc 2 lớp `data.data`
- [ ] **Status Code Matching**: HTTP Status Code phải TRÙNG với `statusCode` trong body
- [ ] **User-Friendly Messages**: `message` viết bằng Tiếng Việt, câu văn hoàn chỉnh
- [ ] **Validation Errors**: Trả `errors` field chỉ cho HTTP 400 validation
- [ ] **Pagination**: List APIs phải có `meta.pagination` khi có phân trang
- [ ] **Path & Timestamp**: Include `path` và `timestamp` cho mỗi error response

### Frontend Developer
- [ ] Bắt `statusCode` và kiểm tra match với HTTP Status
- [ ] Bắt `data` để lấy dữ liệu core (tránh double unwrap)
- [ ] Global Interceptor bắt `error.message` → hiển thị Toast
- [ ] Global Interceptor bắt `error.errors` → highlight form fields
- [ ] List APIs xử lý `meta.pagination` để phân trang

## 9. Configuration Ở Backend (NestJS)

### Global Validation Pipe
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const fieldErrors: Record<string, string[]> = {};
      
      errors.forEach((error) => {
        if (error.property && error.constraints) {
          fieldErrors[error.property] = Object.values(error.constraints);
        }
      });

      return new BadRequestException({
        message: 'Thông tin đầu vào không hợp lệ',
        errors: fieldErrors,
      });
    },
  }),
);
```

### Global Exception Filter
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Map HTTP status code to error name
    // Extract message
    // Return standardized error response
  }
}
```

## 10. Câu Hỏi Thường Gặp (FAQ)

**Q: Khi nào dùng 400 vs 422?**
- **400**: Input validation lỗi (email invalid, field missing)
- **422**: Dữ liệu hợp lệ nhưng semantic error (email valid nhưng đã tồn tại → dùng 409)

**Q: Có cần trả `errors` field cho mọi lỗi?**
- Không, chỉ trả `errors` khi HTTP 400 + lỗi validation form

**Q: Nếu có error ở nested field?**
```json
// Flattening nested fields
{
  "errors": {
    "user.email": ["Email invalid"],
    "profile.displayName": ["Name too short"]
  }
}
```

**Q: Message có thể bằng Tiếng Anh không?**
- Không khuyến khích. Luôn dùng Tiếng Việt để UX tốt nhất

---

**Last Updated**: 2026-05-16
**Version**: 2.0
**Changes**: 
- Thêm Success Response Structure (JSON wrapper với statusCode, data, meta)
- Thêm Pagination Standard cho list APIs
- Thêm Global Rules section với 5 quy tắc bắt buộc (no double wrapping, status code matching, user-friendly messages)
- Nhấn mạnh quy tắc áp dụng toàn cầu cho mọi API
- Cập nhật Implementation Checklist cho cả Success và Error responses
