# Time Requests API Documentation

## 📋 **API Endpoints**

### 1. **Tạo Request**

**POST** `/time-requests`

**Auth**: JWT Required

**Body**:

```json
{
  "type": "overtime" | "day_off" | "remote_work" | "leave_early" | "late_arrival",
  "reason": "Lý do yêu cầu",
  "minutes": 120,  // Bắt buộc cho tất cả type trừ day_off
  "date": "2024-01-15"
}
```

**Validation**:

- `day_off`: KHÔNG cần field `minutes`
- Các type khác: CẦN field `minutes` và phải > 0

**Response**:

```json
{
  "request": {
    "_id": "ObjectId",
    "createdBy": "userId",
    "type": "overtime",
    "reason": "Làm thêm giờ dự án",
    "minutes": 120,
    "date": "2024-01-15T00:00:00.000Z",
    "status": "pending",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### 2. **Update Request**

**PATCH** `/time-requests/:id`

**Auth**: JWT Required

**Verify**: Chỉ update được request của chính mình

**Restriction**: Chỉ update được request có status = `pending`

**Body** (tất cả optional):

```json
{
  "type": "overtime",
  "reason": "Lý do mới",
  "minutes": 180,
  "date": "2024-01-16"
}
```

**Response**:

```json
{
  "request": {
    /* updated request */
  }
}
```

**Errors**:

- `403`: Không có quyền cập nhật request này
- `400`: Không thể cập nhật request đã được xử lý

---

### 3. **Get Own Requests**

**GET** `/time-requests/my`

**Auth**: JWT Required

**Query Params**:

- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `deleted` (boolean: `true`/`false`, default: false)

**Sorting**: Theo `createdAt` giảm dần (mới nhất trước)

**Response**:

```json
{
  "data": [
    {
      "_id": "ObjectId",
      "type": "overtime",
      "reason": "Làm thêm giờ",
      "minutes": 120,
      "date": "2024-01-15T00:00:00.000Z",
      "status": "pending",
      "createdBy": "userId",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      "deletedAt": null
    }
  ],
  "totalPages": 5
}
```

---

### 4. **Get All Requests** (Admin)

**GET** `/time-requests/all`

**Auth**: Admin/SuperAdmin only

**Query Params**:

- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `date` (ISO date string) - Filter theo ngày cụ thể
- `status` (`pending`/`approved`/`rejected`)

**Note**: Get ALL requests, KHÔNG filter theo `deletedAt`

**Response**:

```json
{
  "data": [
    {
      "_id": "ObjectId",
      "createdBy": "userId",
      "type": "day_off",
      "reason": "Nghỉ phép",
      "date": "2024-01-15T00:00:00.000Z",
      "status": "approved",
      "reviewedBy": "adminId",
      "reviewedAt": "2024-01-15T11:00:00.000Z",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "totalPages": 10
}
```

---

### 5. **Approve Request** (Admin)

**POST** `/time-requests/:id/approve`

**Auth**: Admin/SuperAdmin only

**Response**:

```json
{
  "message": "Đã chấp nhận yêu cầu thành công"
}
```

**Effects**:

- Set `status = "approved"`
- Set `reviewedBy = adminId`
- Set `reviewedAt = current timestamp`

**Errors**:

- `400`: Yêu cầu này đã được xử lý

---

### 6. **Reject Request** (Admin)

**POST** `/time-requests/:id/reject`

**Auth**: Admin/SuperAdmin only

**Response**:

```json
{
  "message": "Đã từ chối yêu cầu thành công"
}
```

**Effects**:

- Set `status = "rejected"`
- Set `reviewedBy = adminId`
- Set `reviewedAt = current timestamp`

---

### 7. **Delete Request** (Soft Delete)

**DELETE** `/time-requests/:id`

**Auth**: JWT Required

**Verify**: Chỉ xóa được request của chính mình

**Response**:

```json
{
  "message": "Xóa yêu cầu thành công"
}
```

**Effects**:

- Set `deletedAt = current timestamp`
- Soft delete (không xóa hẳn khỏi database)

**Errors**:

- `403`: Không có quyền xóa yêu cầu này

---

## 📊 **Request Types**

| Type           | Tên            | Minutes Required | Description               |
| -------------- | -------------- | ---------------- | ------------------------- |
| `overtime`     | Làm thêm giờ   | ✅ Yes           | Yêu cầu tính giờ làm thêm |
| `day_off`      | Nghỉ phép      | ❌ No            | Yêu cầu nghỉ nguyên ngày  |
| `remote_work`  | Làm việc từ xa | ✅ Yes           | Yêu cầu WFH               |
| `leave_early`  | Về sớm         | ✅ Yes           | Yêu cầu về sớm            |
| `late_arrival` | Đi muộn        | ✅ Yes           | Báo đi muộn               |

## 🔒 **Authorization Matrix**

| Endpoint                        | User     | Admin    | SuperAdmin |
| ------------------------------- | -------- | -------- | ---------- |
| POST /time-requests             | ✅       | ✅       | ✅         |
| PATCH /time-requests/:id        | ✅ (own) | ✅ (own) | ✅ (own)   |
| GET /time-requests/my           | ✅       | ✅       | ✅         |
| GET /time-requests/all          | ❌       | ✅       | ✅         |
| POST /time-requests/:id/approve | ❌       | ✅       | ✅         |
| POST /time-requests/:id/reject  | ❌       | ✅       | ✅         |
| DELETE /time-requests/:id       | ✅ (own) | ✅ (own) | ✅ (own)   |

## 🔄 **Request Status Flow**

```
pending → approved (by admin)
        ↘ rejected (by admin)
```

- User tạo request → status = `pending`
- Admin approve/reject → status = `approved`/`rejected`
- User chỉ update được request `pending`
- Request đã xử lý không thể update hoặc thay đổi status

## ✅ **Business Rules**

1. **Create Request**:
   - `day_off` không được có field `minutes`
   - Các type khác phải có `minutes` > 0

2. **Update Request**:
   - Chỉ user tạo request mới update được
   - Chỉ update được request có status = `pending`

3. **Delete Request**:
   - Soft delete (set `deletedAt`)
   - Chỉ user tạo request mới xóa được

4. **Review Request**:
   - Chỉ admin/superadmin mới review được
   - Chỉ review được request có status = `pending`
   - Tự động set `reviewedBy` và `reviewedAt`

5. **Get All Requests (Admin)**:
   - Không filter `deletedAt`
   - Có thể filter theo `date` và `status`

6. **Get Own Requests (User)**:
   - Filter theo `deleted` (true/false)
   - Chỉ lấy request của chính mình

---

## 📝 **Example Usage**

### Tạo yêu cầu nghỉ phép (day_off):

```bash
POST /time-requests
{
  "type": "day_off",
  "reason": "Nghỉ phép năm",
  "date": "2024-01-20"
}
# Không có field minutes
```

### Tạo yêu cầu làm thêm giờ:

```bash
POST /time-requests
{
  "type": "overtime",
  "reason": "Làm thêm giờ dự án X",
  "minutes": 180,
  "date": "2024-01-15"
}
```

### Lấy requests của mình (chưa xóa):

```bash
GET /time-requests/my?page=1&limit=20&deleted=false
```

### Admin lấy tất cả requests pending ngày 15/01:

```bash
GET /time-requests/all?date=2024-01-15&status=pending
```

### Admin approve request:

```bash
POST /time-requests/507f1f77bcf86cd799439011/approve
```
