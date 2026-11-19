# Flow 02: Staff Assignment & Route Planning (demo)

> Slide 13 (`02. ASSIGNMENT & ROUTE PLANS`). Dữ liệu demo được tạo **qua giao diện**, không đụng vào DB.

## Tài khoản

| Vai trò | Tài khoản |
|---|---|
| Customer | `batquyquan@gmail.com` |
| Logistics Manager (LM) | `diechahien@gmail.com` |
| Route Coordinator (RC) | `hoanguyen91011@gmail.com` |
| Transport Specialist (TS) | Võ Gia Huy |

Mật khẩu: mật khẩu demo chung của nhóm (xem trong các script e2e).

## Ranh giới Flow 02

| | Trạng thái hệ thống |
|---|---|
| **Bắt đầu (precondition)** | Deposit đã thanh toán → Transport Plan `APPROVED`, Phase 1 **Pending**, nút *Assign Phase 1* bấm được |
| **Kết thúc (postcondition)** | Đã gán TS và RC; Primary và Backup đều `DRAFT` và **đã Submit for legal review**; TS **chưa** apply dossier template |

Yêu cầu:
1. Nếu người demo trước mình crash thì mình vẫn demo được → **Bộ A**.
2. Nếu mình crash thì người demo sau (Flow 03) vẫn có data → **Bộ B**.

> Mỗi bộ dùng **ngày khác nhau** (ví dụ A: 12–16/01/2027, A dự phòng: 17–21/01/2027, B: 22–26/01/2027), để RC chọn xe không bị trùng lịch.

---

## Bộ A: Precondition (dừng trước bước Assign Phase 1)

### 1. Customer: tạo booking
- [ ] My Workspace → **New request**
- [ ] Pickup: `43, 286 01 Žleby, Czechia`
- [ ] Destination: `Ausbau 5, 19288 Alt Krenzlin, Germany` *(tuyến xuyên biên giới → hệ thống tự tách thành 2 chặng tại cửa khẩu BCP)*
- [ ] Chọn ngày đi và ngày đến → Notes → **Save & continue**
- [ ] Tick **Copper Ridge** và **Starlit Meadow**, ghi note → **Save & continue**
- [ ] 📝 Ghi lại **mã booking**

### 2. LM: duyệt booking, tạo plan và invoice
- [ ] Transport Requests → mở booking → **Approve** → **Approve booking**
- [ ] **Create Transport Plan**: Planned Start (12:00), Planned End, Planning Note → **Save Transport Plan**
- [ ] 📝 Ghi lại **mã TP-…**
- [ ] **Create Invoice** → loại *Quotation* → Valid Until → **Create Invoice** → **Issue Invoice**
- [ ] **Create another invoice** → loại *Deposit* → Due Date → **Create Invoice** → **Issue Invoice**
- [ ] Thanh toán deposit:
  - Nên dùng: Customer mở deposit invoice → **Pay now** *(để LM nhận được thông báo "deposit đã thanh toán" dùng mở đầu demo)*
  - Hoặc LM: **Record payment** → **Confirm payment** *(chưa xác minh LM có nhận thông báo theo cách này không)*

### ✅ Kiểm tra bộ A
- [ ] Transport Plans → TP-A → tab **Personnel**: Phase 1 hiện **Pending**, nút **Assign Phase 1** bấm được
- [ ] LM có thông báo deposit đã thanh toán
- [ ] **KHÔNG** assign Phase 1

> Nên tạo thêm **bộ A dự phòng** (lặp lại bước 1–2 với ngày khác) để còn data nếu phải demo lại.

---

## Bộ B: Postcondition (chạy hết Flow 02)

### 1–2. Làm giống bộ A (dùng ngày khác)
- [ ] 📝 Ghi lại mã booking và **mã TP-B**

### 3. LM: assign Phase 1
- [ ] TP-B → tab **Personnel** → **Assign Phase 1**
- [ ] Transport Specialist: **Võ Gia Huy**
- [ ] Route Coordinator: tài khoản RC
- [ ] **Confirm Phase 1 assignment**

### 4. RC: tạo Primary route
- [ ] Approved Bookings → dòng TP-B → Actions → **Create Primary Route** → **Next**
- [ ] Trên bản đồ, bấm điểm đi rồi bấm điểm đến → **Confirm & Auto-Split Route**
- [ ] Từng chặng: **Select vehicle** → tick xe → **Confirm vehicles** *(muốn giống kịch bản demo thì đổi 1 chặng sang **Outsourced** → **Assign provider**)*
- [ ] Điền Rest Time → **Next** → **Save Draft**
- [ ] 📝 Ghi lại **mã route Primary**

### 5. RC: tạo Backup route
- [ ] Approved Bookings → Actions → **View Transport** → **Add Backup Route** → **Next**
- [ ] Chọn điểm trên bản đồ, gán xe → **Next**
- [ ] Điền **Backup reason** → **Save Draft**
- [ ] 📝 Ghi lại **mã route Backup**

### 6. RC: gửi thẩm định
- [ ] Actions → **View Route Details** → **Submit for legal review** → **Submit**
- [ ] Tab **Contingency** → **View Route Plan** → **Submit for legal review** → **Submit**

### ✅ Kiểm tra bộ B
- [ ] Đăng nhập TS (Võ Gia Huy): có thông báo được phân công và **2 yêu cầu thẩm định** (Primary, Backup)
- [ ] **KHÔNG apply dossier template** trên TP-B (đó là bước mở đầu demo của Flow 03)

### Tự động hoá (tuỳ chọn, Playwright vẫn thao tác trên giao diện thật)
```powershell
# Tạo booking → plan → invoice → Phase 1 (chỉ dùng cho bộ B, vì script assign Phase 1 ở cuối)
$env:START_DATE="22/01/2027"; $env:END_DATE="26/01/2027"; pnpm run test:e2e:inspect

# Tạo Primary + Backup + submit for legal review
$env:TRANSPORT_PLAN_CODE="TP-xxxxxxxx-xxx"; pnpm run test:e2e:route-plan
```
> Script gán xe nội bộ cho mọi chặng (không có chặng outsourced). Như vậy vẫn là postcondition hợp lệ cho Flow 03.

---

## Dữ liệu điền form

> Mỗi bộ có **tag riêng** trong Notes (`[F2-A]`, `[F2-A2]`, `[F2-B]`) để nhìn là biết transport nào thuộc bộ nào, kể cả khi lỡ mất mã.
> Chữ trong các field viết bằng tiếng Anh cho khớp với giao diện.

### Customer: New request

| Field | Bộ A | Bộ A dự phòng | Bộ B |
|---|---|---|---|
| Pickup (Search location) | `Zehuby 43, 286 01 SK, Czechia` → chọn **43, 286 01 Žleby, Czechia** | như A | như A |
| Destination | `Ausbau 5, 19288 Alt Krenzlin, Germany` → chọn **Ausbau 5, 19288 Alt Krenzlin** | như A | như A |
| Expected departure date | 12/01/2027 | 17/01/2027 | 22/01/2027 |
| Expected arrival date | 16/01/2027 | 21/01/2027 | 26/01/2027 |
| Notes | `[F2-A] Two racehorses to Alt Krenzlin stud. Please avoid night driving where possible.` | `[F2-A2] Spare demo booking. Two racehorses to Alt Krenzlin stud.` | `[F2-B] Two racehorses to Alt Krenzlin stud. Handover to Flow 03.` |

**Bước chọn ngựa** (giống nhau cho cả 3 bộ)

| Ngựa | Note |
|---|---|
| Copper Ridge | `Sensitive stomach: hay every 4 hours, no grain on the road.` |
| Starlit Meadow | `Drinks poorly when travelling: offer water at every rest stop.` |

### LM: Create Transport Plan

| Field | Bộ A | Bộ A dự phòng | Bộ B |
|---|---|---|---|
| Planned Start | 12/01/2027 | 17/01/2027 | 22/01/2027 |
| Planned Start time | `12:00` | `12:00` | `12:00` |
| Planned End | 16/01/2027 | 21/01/2027 | 26/01/2027 |
| Planning Note | `[F2-A] Cross-border CZ → DE. Plan the rest stops around the horses' feeding times.` | `[F2-A2] Spare plan, same route as F2-A.` | `[F2-B] Cross-border CZ → DE. Prepared as the Flow 03 precondition.` |

### LM: Invoices

| Field | Quotation | Deposit |
|---|---|---|
| Invoice type | *Quotation* | *Deposit* |
| Valid Until / Due Date | ngày mai *(Valid Until)* | hôm nay + 4 ngày *(Due Date)* |
| Notes | `[F2-x] Quotation for 2 horses, CZ → DE, valid for 24 hours.` | `[F2-x] Deposit to secure the vehicle and the team. Please pay before the due date.` |

*(Thay `F2-x` bằng tag của bộ đang làm.)*

**Record payment** (chỉ khi LM tự ghi nhận, không dùng Customer Pay now)

| Field | Giá trị |
|---|---|
| Amount | Đúng bằng số tiền của deposit invoice |
| Payment method | *Bank transfer* |
| Paid at | Hôm nay |
| Transaction reference | `DEP-F2A-001` / `DEP-F2A2-001` / `DEP-F2B-001` |
| Note | `Deposit received by bank transfer.` |

### LM: Assign Phase 1 (bộ B, và lúc demo trên bộ A)

| Field | Giá trị |
|---|---|
| Transport Specialist | **Võ Gia Huy** |
| Route Coordinator | **Nguyễn H…** (tài khoản `hoanguyen91011@gmail.com`) |

### RC: Primary route (bộ B, và lúc demo trên bộ A)

| Field | Giá trị |
|---|---|
| Map | Bấm marker **Start** → marker **End** → **Confirm & Auto-Split Route** |
| Chặng 1 (đến cửa khẩu) | **Internal fleet** → Select vehicle: **Mercedes-Benz Actros Horse** |
| Chặng 2 (sau cửa khẩu) | **Outsourced** → Transport Provider: chọn provider đầu tiên trong danh sách |
| Service type / reference / note (chặng outsource) | `ROAD_TRUCK · German leg by partner carrier · ref OUT-F2-001` |
| Rest Time (Minutes) | Chặng 1: `15` · Chặng 2: `30` |

> Nếu hiện hộp thoại *"Vehicle country differs from departure"* thì bấm **Continue selecting**.

### RC: Backup route

| Field | Giá trị |
|---|---|
| Map | Start → End. Muốn có điểm trung gian khác Primary thì dùng **Select location to insert...** để chèn 1 điểm |
| Chặng 1, chặng 2 | Đều **Internal fleet** → **Mercedes-Benz Actros Horse** (hoặc xe đầu tiên trong danh sách) |
| Rest Time (Minutes) | `15` / `30` |
| Backup reason | `Contingency route through an alternative waypoint in case the primary border crossing is congested or closed.` |

### RC: Submit for legal review
- Không có field nào phải điền: bấm **Submit for legal review** → **Submit** (làm cho cả Primary và Backup).

---

## Bảng ghi mã dữ liệu demo

| Bộ | Booking | TP | Ngày đi–đến | Deposit invoice | Route Primary | Route Backup | TS / RC | Trạng thái cần đạt |
|---|---|---|---|---|---|---|---|---|
| A (pre) | | | | | — | — | — / — | Deposit đã trả, Phase 1 Pending |
| A dự phòng | | | | | — | — | — / — | Deposit đã trả, Phase 1 Pending |
| B (post) | | | | | | | Võ Gia Huy / … | 2 route đã submit, chưa có template |

---

## Kịch bản demo Flow 02 (dùng bộ A)

**Trước khi lên demo**
- Mở 3 tab (hoặc 3 profile trình duyệt), đăng nhập sẵn **LM**, **RC**, **TS**
- Ghi sẵn mã TP-A, và mã TP-B để dự phòng

### ① Hệ thống ghi nhận deposit, phần phân công được mở
- Tab **LM** → chuông thông báo → chỉ vào thông báo *deposit đã thanh toán* của TP-A
- Transport Plans → TP-A → tab **Personnel**
- Chỉ vào nút **Assign Phase 1** đang sáng → *"Phase 1 chỉ mở khi customer đã trả deposit, tức là plan đã sang APPROVED."*

### ② LM phân công đội
- **Assign Phase 1** → TS: *Võ Gia Huy*, RC: tài khoản RC
- **Confirm Phase 1 assignment** → chỉ vào chip **Assigned**

### ③ RC lập Primary route
- Chuyển sang tab **RC** → chuông → thông báo *được phân công*
- Approved Bookings → dòng TP-A → Actions → **Create Primary Route** → **Next**
- Bấm điểm đi → điểm đến trên bản đồ → **Confirm & Auto-Split Route** → *"Tuyến qua biên giới nên hệ thống tự tách tại cửa khẩu thành 2 chặng."*

### ④ RC gán xe và gửi thẩm định Primary
- Chặng 1: **Select vehicle** → tick xe → **Confirm vehicles**
- Chặng 2: đổi sang **Outsourced** → **Assign provider** → *"Chặng này thuê đơn vị vận chuyển ngoài."*
- Rest Time → **Next** → **Save Draft**
- **View Route Details** → **Submit for legal review** → **Submit**

### ⑤ RC lập Backup route
- Approved Bookings → Actions → **View Transport** → **Add Backup Route** → **Next**
- Chọn điểm trên bản đồ → 2 chặng, đều **Internal**

### ⑥ RC gán xe và gửi thẩm định Backup
- Gán xe cho cả 2 chặng → **Next** → **Backup reason** → **Save Draft**
- Tab **Contingency** → **View Route Plan** → **Submit for legal review** → **Submit**

### ⑦ TS nhận yêu cầu thẩm định
- Chuyển sang tab **TS** → chuông → thông báo *được phân công* và **2 yêu cầu thẩm định** (Primary, Backup)
- Câu chuyển tiếp: *"TS phải apply dossier template thì nút review mới hiện. Phần đó nằm ở Flow 03, mời bạn tiếp theo."*

---

### Nếu bị hỏi về việc TS chặn một chặng (chỉ trả lời miệng, không demo)
- Khi thẩm định, TS có thể **chặn một chặng** của route → route quay về RC → RC cấu hình lại chặng đó, gán lại xe → **submit lại**.

### Nếu demo bị lỗi giữa chừng
- Mở **TP-B** (đã có sẵn Phase 1 và 2 route đã submit) → nói lướt qua kết quả → chuyển sang Flow 03.
