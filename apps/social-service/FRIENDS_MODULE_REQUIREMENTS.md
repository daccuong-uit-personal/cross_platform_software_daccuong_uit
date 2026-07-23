# Yêu cầu API cho Module Friends (Hub Bạn Bè)

Tài liệu này định nghĩa các API cần thiết cho 9 chức năng (tabs) trong Hub Bạn Bè của Frontend.

## 1. Các Tabs & Endpoint Tương Ứng

| Tab | Mô tả | Endpoint Đề Xuất | Method |
|-----|-------|------------------|--------|
| **Lời mời kết bạn** | Danh sách lời mời kết bạn nhận được | `/friendship/requests/received` | `GET` |
| **Lời mời đã gửi** | Danh sách lời mời kết bạn đã gửi đi | `/friendship/requests/sent` | `GET` |
| **Gợi ý** | Danh sách những người có thể quen biết (bạn chung) | `/friendship/suggestions` | `GET` |
| **Tất cả bạn bè** | Danh sách bạn bè hiện tại | `/friendship/friends` | `GET` |
| **Người đang follow** | Danh sách những người user đang theo dõi | `/follow/following` | `GET` |
| **Người đã follow** | Danh sách những người theo dõi user (Followers) | `/follow/followers` | `GET` |
| **Mối quan hệ** | Xem thông tin mối quan hệ (gia đình, hẹn hò, etc) | `/friendship/relationships` | `GET` |
| **Chặn** | Danh sách những người đã bị chặn | `/users/blocked` | `GET` |
| **Mute** | Danh sách những người đã bị ẩn nội dung | `/users/muted` | `GET` |

*Lưu ý: Tất cả các API GET dạng danh sách đều yêu cầu hỗ trợ Pagination chuẩn như đã định nghĩa ở `FE_INTEGRATION.md`.*

## 2. DTO Mẫu Cho Response Danh Sách Người Dùng

Để Frontend hiển thị nhất quán trên Component `FriendCard`, response API (data của từng item) cần trả về format bao gồm:

```json
{
  "id": "uuid",
  "name": "Tên Hiển Thị",
  "avatar": "url_to_avatar",
  "mutualFriends": 12, // Dành cho avatar-card (Gợi ý, lời mời)
  "relationshipDate": "2023-10-01T00:00:00Z", // Ngày follow, ngày kết bạn (dành cho list-row)
  "status": "pending | accepted | suggested",
  "relationshipType": "friend | sibling | dating" // Dành cho tab mối quan hệ
}
```

## 3. Các Action Đi Kèm (Mutations)

Bên cạnh việc Get list, Frontend cũng cần các thao tác tương tác từ Card:

- `/friendship/requests/:id/accept` (POST) - Xác nhận kết bạn
- `/friendship/requests/:id/decline` (POST) - Xóa/Từ chối lời mời
- `/friendship/requests` (POST) - Gửi lời mời kết bạn (body: targetUserId)
- `/follow` (POST) - Follow (body: targetUserId)
- `/follow/unfollow` (POST) - Bỏ follow
- `/users/block` (POST) - Bỏ chặn/Chặn
- `/users/mute` (POST) - Bỏ mute/Mute

## 4. Chú ý
- Việc chặn (Block) sẽ tự động hủy kết bạn và hủy follow 2 chiều.
- Cần sử dụng Redis hoặc Counter cache để lấy đếm số lượng bạn chung (`mutualFriends`) nhanh chóng.
