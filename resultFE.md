# Báo cáo quét Frontend - i-resource_hub_FE

Đường dẫn quét: `i-resource_hub_FE/src`

Ngày tạo: 2026-05-02

---

## Tổng quan dự án

- **Công nghệ:** Angular 21.2.1 (Standalone Components)
- **UI Framework:** Taiga UI v4.73.0 + Material Angular v21.2.1
- **Build tool:** Angular CLI (`ng serve`, `ng build`)
- **Package Manager:** npm 10.9.2
- **Routing:** Angular Router với lazy loading

---

## 1. Module Xác thực (Authentication) ✅

### Tệp: `features/auth/`

#### 1.1 Đăng nhập (Login)

- **File:** `login/login.component.ts|html|css`
- **Chức năng:**
  - Form đăng nhập với username và password
  - Validation form (required fields)
  - Gọi API `authService.login()` tới backend
  - Hiển thị loading state và error message
  - Điều hướng tới dashboard sau khi đăng nhập thành công
  - Có component `LoginFormLeft` (hình ảnh bên trái)
  - Dùng Taiga UI components: TuiTextfield, TuiPassword, TuiButton, TuiLoader
  - Route: `/login` (bảo vệ bằng loginGuard)

#### 1.2 Đăng ký (Register)

- **File:** `register/register.component.ts|html|css`
- **Chức năng:**
  - Form đăng ký với username, email, password, confirm password
  - Dropdown chọn Đơn vị công tác (Organizational Unit)
    - **Lưu ý:** Việc chọn Unit chủ yếu áp dụng cho người dùng loại **Cán bộ/Giáo vụ/Giảng viên**. Đối với **Sinh viên**, việc gắn Unit có thể diễn ra tự động hoặc không bắt buộc tùy logic hệ thống.
    - Việc chọn Unit giúp phân định quyền hạn theo mô hình **Row-Level Security (RLS)** - đảm bảo mỗi user chỉ xem/sửa dữ liệu thuộc Unit của họ
  - Load danh sách unit từ API khi khởi tạo
  - Validation form (required, password match, email format)
  - Gọi API `authService.register()` tới backend
  - Hiển thị loading state, error message, success message
  - Dùng `IrhSelect` component tùy chỉnh để chọn unit
  - Route: `/register` (bảo vệ bằng loginGuard)

#### 1.3 Quên mật khẩu (Forgot Password)

- **File:** `forgot-password/forgot-password.component.ts|html|css`
- **Chức năng:**
  - Form nhập email để reset mật khẩu
  - Gửi yêu cầu tới API backend
  - Hiển thị thông báo xác nhận gửi email
  - Route: `/forgot-password` (bảo vệ bằng loginGuard)

#### 1.4 Guards & Security

- **File:** `core/guards/auth.guard.ts`
  - `authGuard`: Kiểm tra xem user đã đăng nhập (có JWT token)
  - `loginGuard`: Kiểm tra xem user chưa đăng nhập (chuyển hướng nếu đã login)
- **File:** `core/interceptors/auth.interceptor.ts`
  - Tự động thêm JWT token vào header của tất cả HTTP request
  - Xử lý lỗi 401 Unauthorized (có thể refresh token hoặc redirect tới login)

---

## 2. Module Tài nguyên (Resources) ✅

### Tệp: `features/resources/`

#### 2.1 Danh sách tài nguyên (Resources)

- **File:** `resources.component.ts|html|css`
- **Chức năng:**
  - Hiển thị danh sách template tài nguyên dưới dạng grid với ag-Grid
  - Chọn loại tài nguyên theo Category (dropdown)
  - Chọn Đơn vị sở hữu (Organization Unit)
  - Tìm kiếm, lọc tài nguyên theo các tiêu chí
  - Hiển thị thông tin: Tên, Mô tả, Số lượng có sẵn, Hình ảnh
  - Cột hành động (Action Renderer):
    - **Xem chi tiết (View Details):** popup modal hiển thị thông tin đầy đủ
    - **Mượn (Borrow):** mở dialog để chọn ngày, khung giờ, số lượng
  - Chức năng drag-drop nhiều tài nguyên vào giỏ hàng (Cart)
  - Dùng custom `IrhImage` component để hiển thị ảnh tài nguyên
  - Dùng `IrhMultiSelect` để chọn nhiều category/unit cùng lúc
  - Route: `/resources`

#### 2.2 Thêm/Sửa tài nguyên (Quản trị)

- Chức năng được triển khai trong component resources
- Tạo template tài nguyên mới: ghi tên, mô tả, loại, đơn vị sở hữu
- Cập nhật thông tin template tài nguyên

---

## 3. Module Danh mục (Categories) ✅

### Tệp: `features/categories/`

#### 3.1 Quản lý Danh mục

- **File:** `categories.component.ts|html|css`
- **Chức năng:**
  - Hiển thị danh sách danh mục dạng cây (Tree structure) với PrimeNG TreeTable
  - Hỗ trợ danh mục con (child categories) - phân cấp
  - **Thêm danh mục:**
    - Dialog form input: Tên danh mục, Mô tả
    - Chọn danh mục cha (parent category)
    - Validation: Tên required, max 100 ký tự; Mô tả max 500 ký tự
  - **Sửa danh mục:** Dialog chỉnh sửa thông tin
  - **Xóa danh mục:** Xác nhận trước khi xóa
  - Hiển thị loading state trong quá trình fetch data
  - Dùng ag-Grid để hiển thị danh sách
  - Custom `ActionRendererComponent` cho nút hành động
  - Gọi API `categoryService` để CRUD
  - Thông báo lỗi/thành công qua `notificationService`
  - Route: `/admin/categories`

---

## 4. Module Đơn vị tổ chức (Organization Units) ✅

### Tệp: `features/organization-units/`

#### 4.1 Quản lý Đơn vị tổ chức

- **File:** `organization-units.component.ts|html|css`
- **Chức năng:**
  - Hiển thị danh sách đơn vị tổ chức dạng cây (Tree structure)
  - Hỗ trợ đơn vị con (child units) - phân cấp
  - **Thêm đơn vị:**
    - Dialog form input: Tên đơn vị, Loại đơn vị, Mô tả
    - Chọn đơn vị cha (parent unit)
    - Validation: Tên required, Loại required
  - **Sửa đơn vị:** Dialog chỉnh sửa thông tin
  - **Xóa đơn vị:** Xác nhận trước khi xóa
  - Hiển thị loading state
  - Gọi API `organizationUnitService` để CRUD
  - Thông báo lỗi/thành công
  - Route: `/admin/organization-units`

---

## 5. Module Thiết bị cụ thể (Resource Items) ✅

### Tệp: `features/resource-items/`

#### 5.1 Quản lý Item tài nguyên

- **File:** `resource-item.component.ts|html|css`
- **Chức năng:**
  - Hiển thị danh sách các instance cụ thể của tài nguyên (Resource Items)
  - Mỗi item là 1 thiết bị vật lý có serial number, tình trạng
  - **Thêm item:**
    - Form input: Chọn Template tài nguyên, Đơn vị sở hữu, Số lượng thêm, Trạng thái
    - Validation form
    - Batch create: thêm nhiều item cùng lúc
  - **Sửa item:** Cập nhật thông tin trạng thái, đơn vị sở hữu
  - **Xóa item:** Xóa khỏi hệ thống
  - Dùng ag-Grid hiển thị
  - Gọi API `resourceItemService`
  - Route: `/admin/resource-items`

---

## 6. Module Đặt mượn (Bookings) ✅

### Tệp: `features/bookings/`

#### 6.1 Bảng Kanban quản lý đơn mượn (Admin)

- **File:** `booking-board/booking-board.component.ts|html|css`
- **Chức năng:**
  - Hiển thị 4 cột Kanban board cho trạng thái đơn mượn:
    - **PENDING** (Chờ duyệt)
    - **APPROVED** (Đã duyệt)
    - **BORROWED** (Đã mượn)
    - **RETURNED** (Đã trả)
  - Drag-and-drop các thẻ booking giữa các cột
  - Mỗi thẻ hiển thị: Tên tài nguyên, Người mượn, Ngày, Khung giờ
  - **Từ chối đơn (REJECT):**
    - Mở dialog `RejectReasonDialogComponent`
    - Nhập lý do từ chối
    - Gọi API reject
  - **Duyệt đơn (APPROVE):** Chuyển sang trạng thái APPROVED
  - **Bàn giao (HANDOVER):**
    - Mở dialog `HandoverDialogComponent`
    - Scan QR code để check-in
    - Xác nhận bàn giao
  - **Báo cáo sự cố (EVIDENCE) / Lấy bằng chứng:**
    - Nút **"Báo cáo sự cố"** có sẵn trên thẻ booking khi ở trạng thái **BORROWED**
    - Mở dialog `EvidenceDialogComponent`
    - Hỗ trợ upload **nhiều ảnh/tài liệu** bằng chứng cùng lúc
    - Frontend tự động **gom link các file upload lại** để gửi xuống Backend
    - Cho phép ghi chú chi tiết về sự cố
  - Auto-refresh dữ liệu từ API `getKanbanBookings()`
  - Route: `/admin/bookings`

#### 6.2 Đơn mượn của tôi (User)

- **File:** `my-bookings/my-bookings.component.ts|html|css`
- **Chức náng:**
  - Hiển thị danh sách các đơn mượn của user hiện tại
  - Xem chi tiết từng đơn mượn
  - **Hủy đơn mượn (CANCEL):**
    - Mở dialog `CancelReasonDialogComponent`
    - Nhập lý do hủy (bắt buộc)
    - Gọi API cancel
  - Hiển thị trạng thái: Pending, Approved, Borrowed, Returned
  - Dùng ag-Grid hiển thị
  - Route: `/my-bookings`

#### 6.3 Dialog components cho Bookings

- **`booking-request-dialog/`:** Dialog tạo đơn mượn mới (chọn tài nguyên, ngày, khung giờ, số lượng)
- **`cart-dialog/`:** Dialog giỏ hàng - xem và quản lý các item chuẩn bị mượn
- **`reject-reason-dialog/`:** Dialog nhập lý do từ chối
- **`cancel-reason-dialog/`:** Dialog nhập lý do hủy
- **`handover-dialog/`:** Dialog tích hợp **Camera (WebRTC)** để scan QR code sinh viên hoặc nhập token thủ công để bàn giao nhanh chóng
- **`evidence-dialog/`:** Dialog upload bằng chứng (ảnh, file) - hỗ trợ batch upload

---

## 7. Module Người dùng (User Management) ✅

### Tệp: `features/user/`

#### 7.1 Quản lý người dùng (Admin)

- **File:** `user.component.ts|html|css`
- **Chức náng:**
  - Hiển thị danh sách tất cả người dùng dạng grid (ag-Grid)
  - **Thêm người dùng:**
    - Dialog form: username, email, password, họ tên, loại người dùng, đơn vị
    - Validation form
  - **Sửa người dùng:** Cập nhật thông tin
  - **Xóa người dùng:** Xác nhận trước
  - **Phân quyền (Authorization):**
    - Mở component `UserAuthorizationComponent`
    - Chọn role (STUDENT, STAFF, ADMIN, SUPERADMIN)
    - Assign quyền cụ thể cho user
  - Dùng ag-Grid với custom renderers:
    - `UserActionRendererComponent` (các nút action)
    - `UserStatusBadgeRendererComponent` (hiển thị status badge)
  - Gọi API `userService` để CRUD
  - Route: `/admin/users`

#### 7.2 Phân quyền người dùng

- **File:** `user/user-authorization/user-authorization.component.ts|html`
- **Chức năng:**
  - Lựa chọn role cho user (dropdown)
  - Lựa chọn các permission cụ thể (multi-select)
  - Gọi API `updateRolePermissions()` để cập nhật

---

## 8. Module Dashboard ✅

### Tệp: `features/dashboard/`

#### 8.1 Dashboard chính

- **File:** `dashboard.component.ts|html`
- **Chức năng:** Hiển thị trang chủ/overview (hiện chỉ là placeholder)
- **Chuẩn bị:** Nên thêm thống kê, biểu đồ, quick stats
- **Route:** `/dashboard` (mặc định sau khi login)

---

## 9. Layouts & Navigation ✅

### Tệp: `layouts/`

#### 9.1 Layout chính (Admin Layout)

- **File:** `admin-layout/admin-layout.ts`
- **Chức náng:**
  - Wrapper chính cho toàn bộ trang admin
  - Chứa Header và Sidebar
  - Router outlet để render các route con

#### 9.2 Header (Thanh trên)

- **File:** `header/`
- **Chức năng:**
  - Logo/Tên ứng dụng
  - Thông tin người dùng
  - Nút logout
  - Thông báo (notifications)

#### 9.3 Sidebar (Menu bên trái)

- **File:** `sidebar/`
- **Chức năng:**
  - Menu điều hướng chính
  - Links tới các trang:
    - Dashboard
    - Resources (Tài nguyên)
    - My Bookings (Đơn mượn của tôi)
    - Admin menu (nếu role = ADMIN/SUPERADMIN):
      - Categories (Danh mục)
      - Organization Units (Đơn vị)
      - Resource Items (Item tài nguyên)
      - Bookings (Quản lý đơn mượn)
      - Users (Quản lý người dùng)
  - Expand/collapse menu
  - Highlight active route

---

## 10. Shared Components ✅

### Tệp: `shared/components/`

Các component tái sử dụng:

#### 10.1 IrhSelect

- **Chức năng:** Dropdown select tùy chỉnh (single select)
- **Props:** options, label, placeholder, disabled, etc.

#### 10.2 IrhMultiSelect

- **Chức năng:** Multi-select dropdown
- **Props:** options, labels, placeholder, disabled, etc.

#### 10.3 IrhImage

- **Chức năng:** Hiển thị ảnh với fallback (nếu lỗi load thì hiển thị placeholder)

#### 10.4 IrhAggridComponent

- **Chức năng:** Wrapper cho ag-Grid
- **Props:** columnDefs, rowData, loading state, pagination, etc.

#### 10.5 LoginFormLeft

- **Chức năng:** Component hình ảnh/graphics hiển thị bên trái form login/register

#### 10.6 Notification

- **Chức năng:** Toast notification (success, error, warning, info)

---

## 11. Core Services ✅

### Tệp: `core/api/`

Các service gọi API backend:

| Service                        | Chức năng                                          |
| ------------------------------ | -------------------------------------------------- |
| `auth.service.ts`              | Login, Register, Forgot Password, Verify Token     |
| `booking.service.ts`           | CRUD Booking, Check-in/Check-out, Get Kanban Board |
| `category-service.ts`          | CRUD Category, Get Category Tree                   |
| `file-upload.service.ts`       | Upload file (ảnh, document)                        |
| `notification.ts`              | Gửi notification tới user (WebSocket?)             |
| `organization-unit-service.ts` | CRUD Organization Unit, Get Tree Structure         |
| `resource-item-service.ts`     | CRUD Resource Item                                 |
| `resource-template-service.ts` | CRUD Resource Template                             |
| `role.service.ts`              | Quản lý Role & Permissions                         |
| `user-service.ts`              | CRUD User, Get User Profile                        |
| `sidebar.service.ts`           | Lấy danh sách menu sidebar                         |

---

## 12. Core Models ✅

### Tệp: `core/models/`

| Model                        | Mô tả                                                              |
| ---------------------------- | ------------------------------------------------------------------ |
| `auth.model.ts`              | LoginRequest, SignUpRequest, JWTResponse                           |
| `booking.model.ts`           | Booking, BookingStatus, TimeSlot                                   |
| `category.model.ts`          | Category, CategoryCreateRequest, CategoryUpdateRequest             |
| `organization-unit.model.ts` | OrganizationUnit, OrganizationUnitCreateRequest, etc.              |
| `resource-item.model.ts`     | ResourceItem, ResourceItemCreateRequest, ResourceItemUpdateRequest |
| `resource-template.model.ts` | ResourceTemplate, ResourceTemplateCreateRequest, etc.              |
| `role.model.ts`              | Role, RoleDetailResponse, Permission                               |
| `user.model.ts`              | User, UserResponse, UserRequest                                    |
| `sidebar.model.ts`           | SidebarItem, SidebarMenuGroup                                      |

---

## 13. UI Framework & Libraries ✅

### Taiga UI

- Core components: Button, Icon, Textfield, Loader, Dialog, Form
- Kit: Badge, FloatingContainer, Password, Select
- Layout: Header, Form
- Advanced: TuiExperimental Dialog

### AG-Grid

- Enterprise grid component cho data tables
- Custom cell renderers cho actions, images, badges
- Sorting, filtering, pagination

### PrimeNG

- TreeTable cho hiển thị cấu trúc cây (Categories, Organization Units)

### Angular Material

- CDK Drag-Drop cho Kanban board

### Taiga UI CDK

- Input masking, observables wrappers, accessibility features

### QR Code Libraries

- **`angularx-qrcode`**: Dùng để **generate (tạo) mã vạch QR** cho Ticket trên màn hình "My Bookings" của sinh viên
- **`ngx-scanner-qrcode`**: Dùng để **scan (quét) mã QR** thông qua camera khi check-in bàn giao tài nguyên

---

## 14. Routing & Guards ✅

### Cấu trúc routing:

```
/login (public - loginGuard)
/register (public - loginGuard)
/forgot-password (public - loginGuard)
/ (private - authGuard)
  ├─ /dashboard
  ├─ /resources
  ├─ /my-bookings
  ├─ /admin/categories
  ├─ /admin/organization-units
  ├─ /admin/resource-items
  ├─ /admin/bookings
  ├─ /admin/users
```

### Guards:

- **authGuard:** Kiểm tra JWT token, redirect tới login nếu không có
- **loginGuard:** Redirect dashboard nếu đã login

---

## 15. Styling & Assets ✅

### Tệp: `src/`

- `main.ts` - Bootstrap Angular app
- `index.html` - HTML entry point
- `styles.css` - Global styles
- `material-theme.scss` - Taiga UI theme customization
- `assets/` - Images, icons, fonts

---

## 16. Các chức năng chính đã sẵn sàng

### ✅ Authentication

- [x] Đăng nhập
- [x] Đăng ký
- [x] Quên mật khẩu
- [x] JWT Token handling
- [x] Auth guards

### ✅ Resource Management

- [x] Xem danh sách tài nguyên
- [x] Lọc theo category, organization unit
- [x] Xem chi tiết tài nguyên
- [x] Thêm/Sửa/Xóa tài nguyên (admin)
- [x] Upload hình ảnh tài nguyên

### ✅ Booking Management

- [x] Xem danh sách booking của tôi
- [x] Tạo đơn mượn (chọn ngày, khung giờ, số lượng)
- [x] Hủy đơn mượn (nhập lý do)
- [x] Giỏ hàng (cart) - lưu items chuẩn bị mượn
- [x] Kanban board (admin) - quản lý trạng thái booking
- [x] Duyệt/Từ chối đơn mượn
- [x] Bàn giao (check-in) qua QR code / token
- [x] Trả đồ (check-out) - upload bằng chứng
- [x] Bulk booking - mượn nhiều items cùng lúc

### ✅ Category Management

- [x] Xem danh sách danh mục (tree structure)
- [x] Thêm danh mục con
- [x] Sửa danh mục
- [x] Xóa danh mục
- [x] Validation form

### ✅ Organization Unit Management

- [x] Xem danh sách đơn vị (tree structure)
- [x] Thêm đơn vị con
- [x] Sửa đơn vị
- [x] Xóa đơn vị
- [x] Phân cấp đơn vị

### ✅ Resource Item Management

- [x] Xem danh sách items (instances cụ thể)
- [x] Thêm item (đơn hoặc batch)
- [x] Sửa item (cập nhật trạng thái, đơn vị)
- [x] Xóa item
- [x] Gán item cho template tài nguyên

### ✅ User Management (Admin)

- [x] Xem danh sách user
- [x] Thêm user
- [x] Sửa user
- [x] Xóa user
- [x] Gán role cho user
- [x] Phân quyền (permissions) chi tiết

### ✅ UI/UX

- [x] Navigation (header, sidebar)
- [x] Responsive layout
- [x] Dark theme (Taiga UI theme)
- [x] Loading states
- [x] Error handling & notifications
- [x] Modal dialogs
- [x] Drag-drop Kanban board

---

## 17. Cài đặt & Chạy ứng dụng

### Yêu cầu

- Node.js v18+ (npm 10+)

### Các lệnh

```bash
# Cài đặt dependencies
npm install

# Chạy dev server (http://localhost:4200)
npm start

# Build production
npm run build

# Chạy unit tests
npm test

# Watch mode (tự động rebuild khi có thay đổi)
npm run watch
```

### Cấu hình backend

- Sửa đường dẫn API trong `src/environments/environment.ts`:
  ```typescript
  export const environment = {
    apiUrl: 'http://localhost:2811/api', // Thay đổi nếu backend ở port khác
  };
  ```

---

## 18. Ghi chú & Khuyến nghị

1. **Dashboard**: Hiện chỉ là placeholder, nên thêm thống kê (số booking, tài nguyên, users)
2. **WebSocket**: Component notification có thể dùng WebSocket để real-time notifications
3. **Input masking**: Đã cài `@maskito` library, nên dùng cho phone, ID, date inputs
4. **QR Code**: Dùng `ngx-scanner-qrcode` để scan QR code khi check-in
5. **Testing**: Nên viết unit tests cho services và components quan trọng
6. **Error handling**: Có global error handling qua `auth.interceptor.ts`
7. **Security**: JWT token lưu trong localStorage, nên xem xét dùng httpOnly cookies nếu có điều kiện

### ⚠️ Lưu ý về Row-Level Security (RLS)

**Cảnh báo quan trọng:** Khi gọi các API tạo mới (như tạo tài nguyên, thêm item, v.v.), **Frontend tuyệt đối không tự lấy Unit ID gửi lên** nếu user có role là **MANAGER/STAFF**. Backend sẽ **tự động trích xuất Unit ID từ JWT token** để đảm bảo an toàn dữ liệu. Điều này chính là rule chống **"Trust the Client"** - ngăn chặn người dùng tự ý sửa Unit ID trong request để vượt qua quyền hạn.

---

## 19. Danh sách endpoint API được gọi

### Auth

- `POST /auth/login` - Đăng nhập
- `POST /auth/register` - Đăng ký
- `POST /auth/forgot-password` - Quên mật khẩu
- `POST /auth/reset-password` - Reset mật khẩu

### Bookings

- `GET /bookings/my` - Lấy booking của user
- `GET /bookings/kanban` - Lấy kanban board
- `GET /time-slots` - Lấy danh sách khung giờ
- `POST /bookings` - Tạo booking
- `POST /bookings/bulk` - Tạo bulk booking
- `PUT /bookings/{id}/process` - Duyệt/Từ chối
- `PUT /bookings/{id}/cancel` - Hủy booking
- `POST /bookings/{id}/evidence` - Thêm bằng chứng sự cố (upload ảnh/tài liệu)
- `POST /bookings/check-in` - Bàn giao (check-in)
- `POST /bookings/check-out` - Trả đồ (check-out)

### Categories

- `GET /categories` - Lấy danh sách
- `POST /categories` - Tạo
- `PUT /categories/{id}` - Sửa
- `DELETE /categories/{id}` - Xóa

### Organization Units

- `GET /organization-units` - Lấy danh sách
- `POST /organization-units` - Tạo
- `PUT /organization-units/{id}` - Sửa
- `DELETE /organization-units/{id}` - Xóa

### Resource Items

- `GET /resource-items` - Lấy danh sách
- `POST /resource-items` - Tạo
- `POST /resource-items/batch` - Tạo batch
- `PUT /resource-items/{id}` - Sửa
- `DELETE /resource-items/{id}` - Xóa

### Resources (Templates)

- `GET /resources` - Lấy danh sách template
- `POST /resources` - Tạo template
- `PUT /resources/{id}` - Sửa template
- `DELETE /resources/{id}` - Xóa template

### Users

- `GET /users` - Lấy danh sách users
- `POST /users` - Tạo user
- `PUT /users/{id}` - Sửa user
- `DELETE /users/{id}` - Xóa user
- `POST /users/{id}/authorize` - Gán role/permissions

### File Upload

- `POST /file-upload` - Upload file

### Sidebar

- `GET /sidebar` - Lấy menu sidebar (role-based)

---

**Báo cáo kết thúc** | Ngày: 2026-05-02
