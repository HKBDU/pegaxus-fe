# Kịch bản demo Playwright

Tài liệu này chỉ phục vụ **buổi demo**: kịch bản theo từng bước và danh sách lệnh để copy. Giải thích chi tiết về Playwright, thiết kế bộ test và cách viết thêm test nằm ở [PLAYWRIGHT.md](./PLAYWRIGHT.md).

Mọi lệnh chạy ở thư mục gốc của Front-end (`NEW_PROJECT`).

---

## 1. Cách đọc bảng lệnh

Mỗi lệnh được ghi rõ 3 điều:

| Cột | Giá trị | Ý nghĩa |
|---|---|---|
| **Trình duyệt** | `Headless` | Chạy ngầm, **không có cửa sổ**. Terminal chỉ in kết quả. |
| | `Mở Chrome` | **Hiện cửa sổ** trình duyệt để người xem theo dõi. |
| **Kiểu chạy** | `Tự chạy` | Chạy các test **có sẵn** trong thư mục `e2e/`, không cần bạn thao tác. |
| | `Gen code` | **Ghi lại thao tác của bạn** rồi sinh ra code test. Không chạy test có sẵn. |
| | `Tương tác` | Bạn điều khiển từng bước (chạy lại, tạm dừng, xem timeline). |
| **Dữ liệu** | `Mock` | Mọi cuộc gọi Backend bị chặn và trả dữ liệu giả ngay trong trình duyệt. Không cần Backend, không cần mạng, **không ghi gì vào database**. |
| | `API thật` | Gọi **Backend thật + database thật** (Backend mà `VITE_API_URL` trong `.env` trỏ tới). **Có ghi dữ liệu.** |

---

## 2. Bảng tra nhanh: lệnh nào làm gì

### 2.1. Chạy test tự động

| Lệnh | Trình duyệt | Kiểu chạy | Dữ liệu | Dùng khi |
|---|---|---|---|---|
| `pnpm test:e2e` | Headless | Tự chạy | Mock | Chạy cả bộ 58 test, xem kết quả `✓` / `✘` trong terminal |
| `pnpm test:e2e:demo` | **Mở Chrome**, chậm 700 ms mỗi thao tác | Tự chạy | Mock | **Lệnh demo chính**: người xem thấy form được gõ, nút được bấm |
| `pnpm test:e2e:headed` | **Mở Chrome**, tốc độ thường | Tự chạy | Mock | Muốn thấy cửa sổ nhưng không cần chậm |
| `pnpm test:e2e:real` | Headless | Tự chạy | **API thật** | Kiểm tra Front-end ghép với Backend thật (có ghi dữ liệu) |
| `pnpm test:e2e:real:demo` | **Mở Chrome**, chậm 700 ms | Tự chạy | **API thật** | Demo chạy với Backend thật, người xem thấy từng thao tác |

### 2.2. Công cụ tương tác

| Lệnh | Trình duyệt | Kiểu chạy | Dữ liệu | Dùng khi |
|---|---|---|---|---|
| `pnpm test:e2e:ui` | Mở cửa sổ **UI mode** của Playwright (trình duyệt chạy trong khung đó) | Tương tác | Mock | Bấm chạy từng test, xem timeline, ảnh DOM trước/sau từng bước |
| `pnpm test:e2e:real:ui` | Mở cửa sổ UI mode | Tương tác | **API thật** | Như trên nhưng với Backend thật |
| `pnpm test:e2e:debug` | **Mở Chrome** + cửa sổ Inspector | Tương tác (chạy từng bước) | Mock | Dừng ở từng dòng lệnh để giải thích |
| `pnpm test:e2e:report` | Mở trang báo cáo HTML trong trình duyệt | Chỉ xem | – (xem kết quả lần chạy trước) | Mở báo cáo sau khi chạy xong |

### 2.3. Gen code

| Lệnh | Trình duyệt | Kiểu chạy | Dữ liệu | Dùng khi |
|---|---|---|---|---|
| `pnpm test:e2e:playground` | **Mở Chrome** + Inspector, đã đăng nhập sẵn | **Gen code** (bấm **Record** trong Inspector) | **Mock** | **Gen code an toàn khi demo**: không chạm Backend, không cần `pnpm dev` |
| `pnpm test:e2e:codegen` | **Mở Chrome** + cửa sổ Inspector đang ghi | **Gen code** | **API thật** (không có mock) | Bạn bấm trên web, code test hiện ra bên cạnh theo thời gian thực |

> Chi tiết ba cách gen code (codegen, playground, debug + Record) ở mục 5.
>
> **Codegen cần `pnpm dev` đang chạy ở cổng 5173** (nó mở `http://localhost:5173`). Vì chạy trên dev server nên các thao tác gọi Backend thật theo `.env`: đừng bấm Tạo/Xóa trên tài khoản thật nếu không muốn có dữ liệu mới.

### 2.4. Chạy một phần (thêm vào sau bất kỳ lệnh nào ở 2.1)

| Lệnh | Tác dụng |
|---|---|
| `pnpm test:e2e:demo -g "LOGIN-07"` | Chạy **đúng một test** theo mã, mở Chrome chậm, mock |
| `pnpm test:e2e:demo login.spec.ts` | Chạy **một file** spec, mở Chrome chậm, mock |
| `pnpm test:e2e -g "HORSE"` | Mọi test có chữ `HORSE`, headless, mock |
| `pnpm test:e2e:real:demo -g "REAL-HORSE"` | Chỉ phần thêm ngựa với API thật, mở Chrome chậm |
| `pnpm test:e2e:real:demo -g "REAL-BOOKING-01"` | Chỉ ca tạo booking với API thật, mở Chrome chậm |
| `pnpm typecheck:e2e` | Kiểm tra kiểu cho code test (không chạy trình duyệt) |

> Với PowerShell, chuỗi có khoảng trắng hoặc dấu `|` phải bọc trong dấu nháy, ví dụ `-g "LOGIN-07"`. Mã không có khoảng trắng như trên thì dùng được cả hai.

---

## 3. Cách chạy lệnh trên terminal (đọc kỹ nếu chưa quen)

### 3.1. Cần mở mấy cửa sổ terminal?
**Hai cửa sổ** trong cùng thư mục dự án:

| Terminal | Việc | Để mở |
|---|---|---|
| **Terminal 1** | Chạy `pnpm dev` (web ở `http://localhost:5173`). **Để yên, không tắt.** | Cả buổi demo |
| **Terminal 2** | Gõ các lệnh Playwright (`pnpm test:e2e:demo ...`) | Mỗi lần chạy một lệnh |

Vì sao cần Terminal 1: các lệnh Playwright mặc định dùng **cổng 5173**. Nếu `pnpm dev` đang chạy ở đó thì Playwright **dùng lại luôn** web đó (và không tắt nó khi xong), nên không cần build gì thêm. Nếu cổng 5173 trống, Playwright tự build rồi chạy web ở 5173 (lần đầu mất 1 đến 2 phút) và tự tắt khi xong.

### 3.2. Từng bước
1. **Mở terminal.** Trong VS Code bấm `Ctrl + \`` (phím cạnh số 1), hoặc mở PowerShell. Nếu terminal chưa ở thư mục dự án thì gõ: `cd F:\SWP\FE\NEW_PROJECT`.
2. **Terminal 1:** gõ `pnpm dev`, đợi dòng `Local: http://localhost:5173/`. Để nguyên cửa sổ đó. Mở một trang bất kỳ của web một lần trong trình duyệt của bạn để web "nóng" (lần đầu biên dịch mất 30 giây trở lên).
3. **Mở Terminal 2** (nút `+` trong khung terminal của VS Code). Cũng phải ở thư mục `NEW_PROJECT`.
4. **Terminal 2:** copy một lệnh từ bảng ở mục 4, dán vào, nhấn Enter. Ví dụ: `pnpm test:e2e:demo -g "LOGIN-07"`.
5. **Chờ.** Cửa sổ Chrome tự mở và tự thao tác (với lệnh `demo`). Terminal 2 **bị chiếm** cho tới khi lệnh xong, đó là bình thường.
6. **Xong:** terminal in `1 passed` (đạt) hoặc `failed` (hỏng), rồi trả lại dấu nhắc lệnh để bạn gõ lệnh kế tiếp.

### 3.3. Dừng và đóng đúng cách
| Tình huống | Cách làm |
|---|---|
| Muốn dừng lệnh đang chạy | Bấm `Ctrl + C` trong **Terminal 2** |
| Lệnh có Inspector (`playground`, `debug`, `codegen`) | **Đóng cửa sổ Chrome** hoặc bấm Resume. Đừng để mở quá lâu, vì lệnh đang chờ |
| Muốn tắt web | `Ctrl + C` trong **Terminal 1** (chỉ làm khi hết buổi demo) |

**Không** chạy hai lệnh Playwright cùng lúc ở hai terminal: chúng dùng chung thư mục kết quả nên có thể kẹt nhau. Đóng lệnh trước rồi mới chạy lệnh sau.

### 3.4. Làm một lần trên máy demo
1. `pnpm install` rồi `pnpm exec playwright install chromium` (tải trình duyệt của Playwright).
2. Chạy thử một lệnh nhanh để chắc mọi thứ ổn: `pnpm test:e2e -g "LOGIN-01"` (chạy ngầm, khoảng vài giây đến vài chục giây).

### 3.5. Chỉ cần nếu demo phần **API thật** (người 5)
1. Có tài khoản CUSTOMER dành riêng cho test và điền `PLAYWRIGHT_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` trong `.env` hoặc `.env.e2e` (file bị git bỏ qua; không đưa giá trị này lên màn hình khi demo).
2. Backend free host có thể "ngủ": mở thử web một lần trước buổi demo để đánh thức nó.
3. Tắt các cửa sổ Chrome khác và chiếu màn hình **đúng một** cửa sổ để người xem không bị rối.

---

## 4. Kịch bản demo: 5 người x 5 phút = 25 phút

Mỗi người giữ **một chức năng** và chạy **lệnh của mình**, rồi nhường máy cho người kế tiếp. Chỉ dùng **một máy, một cửa sổ chiếu**. Thứ tự đi từ "nhanh và chắc" (mock) đến "thật nhất" (API thật), nên nếu mạng hoặc Backend có sự cố thì phần quan trọng đã xong.

> Các lệnh chạy ở **Terminal 2**, còn **Terminal 1** đang chạy `pnpm dev` ở cổng 5173 (xem mục 3). Lệnh giống nhau ở Bash, Git Bash và PowerShell.
>
> Mọi lệnh `demo` / `headed` của bộ mock chạy thêm một bước **đăng nhập một lần** (`mock-setup`) trước test bạn chọn, nên sẽ thấy Chrome mở đăng nhập một lần rồi mới tới test. Bình thường, không phải lỗi.
>
> **Thời gian ghi dưới đây là ước lượng chưa đo.** Hãy tập một lượt đủ 5 người trên đúng máy sẽ demo, bấm đồng hồ, rồi chỉnh số test mỗi người cho vừa 5 phút.

| Người | Phút | Chủ đề | Dữ liệu |
|---|---|---|---|
| 1 | 0 đến 5 | Mở đầu và chạy cả bộ test | Mock |
| 2 | 5 đến 10 | Chức năng Đăng nhập | Mock |
| 3 | 10 đến 15 | Chức năng Thêm ngựa | Mock |
| 4 | 15 đến 20 | Chức năng Tạo booking và công cụ gỡ lỗi | Mock |
| 5 | 20 đến 25 | Gen code, API thật, kết luận | Mock rồi API thật |

### Người 1 (0 đến 5 phút): mở đầu và chạy cả bộ

| Việc | Lệnh | Trình duyệt / Kiểu / Dữ liệu |
|---|---|---|
| Chạy cả bộ 58 test | `pnpm test:e2e` | Headless / Tự chạy / Mock |
| Mở báo cáo HTML | `pnpm test:e2e:report` | Mở trang báo cáo / Chỉ xem / Mock |

- Nói: Playwright mở trình duyệt thật và thao tác như người dùng. Có 2 bộ: **mock** (Front-end đúng với mọi phản hồi, không cần Backend, không ghi database) và **API thật** (Front-end ghép được với Backend).
- Vừa chạy vừa giải thích sơ đồ (PLAYWRIGHT.md mục 2). Cho xem `✓` trong terminal rồi báo cáo HTML, nhóm theo 3 chức năng (Login, Add horse, Create booking).
- Dự phòng: cả bộ chưa xong kịp thì mở báo cáo của lần chạy trước và nói "đây là kết quả lần chạy gần nhất".

### Người 2 (5 đến 10 phút): Đăng nhập

| Việc | Lệnh | Trình duyệt / Kiểu / Dữ liệu |
|---|---|---|
| Đăng nhập thành công | `pnpm test:e2e:demo -g "LOGIN-07"` | Mở Chrome, chậm / Tự chạy / Mock |
| Đăng nhập sai | `pnpm test:e2e:demo -g "LOGIN-10"` | Mở Chrome, chậm / Tự chạy / Mock |

- Cho xem: email và mật khẩu được gõ, nút đổi trạng thái, trang chủ mở. Test còn kiểm tra payload gửi lên và phiên được lưu.
- Với ca sai: báo lỗi, vẫn ở trang login, form dùng lại được. Nhấn mạnh test cả **đường lỗi**, không chỉ đường vui.
- Nếu còn thời gian: nói về 16 ca Login (form rỗng, email sai định dạng, tài khoản bị khóa, mất mạng).

### Người 3 (10 đến 15 phút): Thêm ngựa

| Việc | Lệnh | Trình duyệt / Kiểu / Dữ liệu |
|---|---|---|
| Tạo ngựa thành công | `pnpm test:e2e:demo -g "HORSE-10"` | Mở Chrome, chậm / Tự chạy / Mock |
| Tải ảnh đại diện | `pnpm test:e2e:demo -g "HORSE-17"` | Mở Chrome, chậm / Tự chạy / Mock |

- HORSE-10: điền form, tạo, toast, chuyển sang "My horses" và **thấy ngựa mới** (mock có trạng thái nhỏ: POST lưu, GET trả lại).
- HORSE-17: tải ảnh qua 3 bước ký chữ ký (xin chữ ký, gửi ảnh, xác nhận); test kiểm `POST /horses` chỉ mang `avatar.publicId`.
- Nhắc các luật được test: hộ chiếu 15 ký tự HOA hoặc số, microchip 15 chữ số, cân nặng 20 đến 1500 kg, ngày sinh không ở tương lai.

### Người 4 (15 đến 20 phút): Tạo booking và gỡ lỗi

| Việc | Lệnh | Trình duyệt / Kiểu / Dữ liệu |
|---|---|---|
| Tạo booking | `pnpm test:e2e:demo -g "BOOKING-16"` | Mở Chrome, chậm / Tự chạy / Mock |
| Chuyến quốc tế Anh sang Pháp | `pnpm test:e2e:demo -g "BOOKING-22"` | Mở Chrome, chậm / Tự chạy / Mock |
| Xem từng bước, gỡ lỗi | `pnpm test:e2e:ui` | Cửa sổ UI mode / Tương tác / Mock |

- BOOKING-16: tìm địa chỉ, chọn ngày, chọn ngựa, tạo, trang chi tiết hiện **Pending**.
- BOOKING-22: ngày khởi hành sớm nhất là sau 2 tháng cho chuyến quốc tế (nội địa là 21 ngày). Đây là luật nghiệp vụ được khóa bằng test.
- UI mode: bấm chạy một test, kéo timeline xem ảnh trang trước và sau từng bước, xem request đã bị chặn. Giải thích đây là cách tìm lỗi khi test hỏng.
- Dự phòng: UI mode mở chậm thì bỏ bước này và chỉ nói bằng lời.

### Người 5 (20 đến 25 phút): gen code, API thật, kết luận

| Việc | Lệnh | Trình duyệt / Kiểu / Dữ liệu |
|---|---|---|
| Gen code trên **dữ liệu giả** | `pnpm test:e2e:playground` | Mở Chrome + Inspector / **Gen code** / Mock |
| Gen code trên **API thật** (tùy chọn) | `pnpm test:e2e:codegen` (cần `pnpm dev` ở 5173) | Mở Chrome + Inspector / **Gen code** / API thật |
| Smoke test **API thật** | `pnpm test:e2e:real:demo -g "REAL-LOGIN-02"` | Mở Chrome, chậm / Tự chạy / **API thật** |

- Gen code (khoảng 2 phút): trong Inspector bấm **Record**, bấm vài thao tác trên web (mở trang đăng nhập, bấm liên kết), code Playwright hiện ngay. Nói rõ: codegen chỉ sinh **khung thao tác**; test chính thức còn phải thêm kiểm tra (assert) và dữ liệu giả.
- API thật (khoảng 2 phút): chạy **một** ca đăng nhập thật cho nhanh (`REAL-LOGIN-02`). Chạy cả bộ thật (`pnpm test:e2e:real:demo`, 3 chức năng, có tạo ngựa và booking rồi tự dọn) mất lâu hơn nhiều, chỉ làm nếu còn dư thời gian.
- Kết luận (khoảng 1 phút): mock quyết định Front-end đúng, API thật xác nhận ghép với Backend; hai bộ bổ sung cho nhau.
- Dự phòng: Backend ngủ hoặc lỗi mạng thì bỏ bước API thật, nói rõ lý do, kết thúc bằng phần gen code.

**Nếu muốn nhấn mạnh thêm** (mỗi người chọn một): `HORSE-05/06` (luật hộ chiếu, microchip), `BOOKING-20` (thêm ngựa ngay trong hộp thoại và tự được chọn), `LOGIN-14` (mất mạng).

---

## 5. Gen code: ba cách và khác nhau thế nào

| | `test:e2e:codegen` | `test:e2e:playground` | `test:e2e:debug` rồi bấm Record |
|---|---|---|---|
| Dữ liệu | **API thật** (không có mock) | **Mock** (đã đăng nhập sẵn) | **Mock** (test có sẵn đã cài mock) |
| Trang bắt đầu | Trắng, bạn tự mở `localhost:5173` | Trang chủ của khách hàng đã đăng nhập | Dừng ở dòng test bạn chọn |
| Cần `pnpm dev` | Có (cổng 5173) | Không (dùng bản build) | Không |
| Ghi dữ liệu vào database | Có thể (nếu bạn bấm Tạo/Xóa) | Không bao giờ | Không bao giờ |
| Khi nào dùng | Muốn thử trên Backend thật | **Gen code an toàn khi demo** | Muốn ghi tiếp từ giữa một test có sẵn |

Cách dùng `playground`:
1. Chạy `pnpm test:e2e:playground`. Chrome mở, đã đăng nhập, cửa sổ **Inspector** hiện ra.
2. Bấm nút **Record** trong Inspector, rồi thao tác trên trang. Code sinh ra hiện trong Inspector; copy dán vào một spec.
3. Kết thúc: đóng cửa sổ Chrome hoặc bấm Resume.

Playground chỉ có sẵn các API: danh sách ngựa (2 ngựa mẫu) và tạo ngựa. Các API khác trả về danh sách rỗng, không báo lỗi. Muốn trang nào có dữ liệu thì khai báo thêm `api.ok(...)` trong `e2e/playground/playground.spec.ts`.

> Lệnh `playground` không nằm trong `pnpm test:e2e`, nên chạy cả bộ không bao giờ bị dừng chờ.

---

## 6. Lệnh phụ (khi có câu hỏi từ người xem)

| Việc | Lệnh | Trình duyệt / Kiểu / Dữ liệu |
|---|---|---|
| Chạy một test và dừng ở từng dòng | `pnpm test:e2e:debug -g "LOGIN-07"` | Mở Chrome + Inspector / Tương tác / Mock |
| Lặp một test 5 lần để tìm test không ổn định | `pnpm test:e2e -g "LOGIN-07" --repeat-each=5` | Headless / Tự chạy / Mock |
| Chỉ chạy lại test hỏng lần trước | `pnpm test:e2e --last-failed` | Headless / Tự chạy / Mock |
| Ghi trace cho mọi test | `pnpm test:e2e --trace on` | Headless / Tự chạy / Mock |
| Mở file trace đã ghi | `pnpm exec playwright show-trace <đường-dẫn>/trace.zip` | Mở cửa sổ Trace Viewer / Chỉ xem |
| Chạy song song 4 trình duyệt (máy rảnh) | Bash: `E2E_WORKERS=4 pnpm test:e2e` · PowerShell: `$env:E2E_WORKERS=4; pnpm test:e2e` | Headless / Tự chạy / Mock |
| Liệt kê toàn bộ test mà không chạy | `pnpm exec playwright test --list --project=mock` | Không mở trình duyệt / Chỉ liệt kê |

Chỉnh tốc độ của các lệnh `demo`: sửa `SLOW_MO_MS` (mặc định `700`) trong `playwright.demo.config.ts`. Số nhỏ hơn thì chạy nhanh hơn.

---

## 7. Nếu có sự cố trong lúc demo

| Hiện tượng | Cách xử lý nhanh |
|---|---|
| Lệnh `test:e2e*` chờ rất lâu ở lần đầu | Cổng 5173 đang trống nên Playwright tự build rồi mới chạy (1 đến 2 phút). Chạy `pnpm dev` ở Terminal 1 trước (mục 3) |
| Cửa sổ Chrome mở nhưng trang trắng hoặc rất chậm với bộ mock | Dev server ở 5173 còn "nguội": mở web một lần trong trình duyệt của bạn cho nó biên dịch xong, rồi chạy lại |
| Bộ API thật báo `Real-API tests need a CUSTOMER account...` | Thiếu `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` trong `.env` hoặc `.env.e2e` |
| Bộ API thật timeout ở `page.goto` hoặc `ERR_ABORTED` | Dev server còn nguội: mở trang một lần bằng tay rồi chạy lại |
| Bộ API thật lỗi đăng nhập | Backend đang "ngủ" hoặc tài khoản test bị khóa. Chuyển sang demo phần mock, nói rõ lý do |
| Còn dữ liệu "E2E Smoke ..." sau bộ API thật | Bước dọn dẹp lỗi: hủy booking và xóa ngựa đó bằng tay |
| Lệnh Playwright đứng im, không mở Chrome | Có lệnh Playwright khác đang chạy hoặc Chrome/Inspector cũ chưa đóng. Đóng chúng (hoặc `Ctrl + C`) rồi chạy lại |

---

## 8. Nên và không nên khi demo

- **Nên** mở bằng bộ mock (người 1 đến 4): nhanh, ổn định, không phụ thuộc mạng và Backend.
- **Nên** để phần API thật ở cuối, và có sẵn phương án quay về mock nếu Backend không phản hồi.
- **Không** chạy `pnpm test:e2e:real` hoặc `pnpm test:e2e:real:demo` trên Backend production hoặc tài khoản cá nhân: các lệnh này **ghi dữ liệu thật** (tự dọn, nhưng dọn là nỗ lực tối đa).
- **Không** để lộ nội dung `.env` hoặc `.env.e2e` (email và mật khẩu tài khoản test) trên màn hình chiếu.
- **Không** bấm Tạo/Xóa trong cửa sổ codegen nếu không muốn sinh dữ liệu thật.
