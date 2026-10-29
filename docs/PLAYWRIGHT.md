# Kiểm thử end-to-end phía Front-end với Playwright

Tài liệu này mô tả cách Playwright được tích hợp vào dự án **Pegaxus Front-end** (React + Vite + TypeScript), nguyên lý hoạt động của Playwright, cách chạy bộ test và cách viết thêm test mới.

- **Phạm vi:** chỉ Front-end. Backend đã có unit test riêng nên không kiểm thử ở đây.
- **Hai bộ test:** **mock** (58 ca, backend giả, chạy nhanh, lặp lại được) và **real-api** (4 ca smoke test gọi backend và database thật + 1 bước đăng nhập). Xem mục 4 và mục 11.
- **Ba chức năng được kiểm thử:** (1) Đăng nhập, (2) Thêm ngựa, (3) Tạo booking (phía khách hàng; việc Logistics Manager duyệt booking nằm ngoài phạm vi).
- **Phiên bản:** `@playwright/test` 1.64.x, trình duyệt Chromium.

---

## 1. Playwright là gì?

Playwright là framework **kiểm thử end-to-end (E2E)** do Microsoft phát triển. Một test E2E điều khiển một **trình duyệt thật** để thực hiện đúng các thao tác của người dùng (gõ chữ, bấm nút, chuyển trang) rồi kiểm tra kết quả hiển thị trên màn hình.

So với các mức kiểm thử khác trong kim tự tháp kiểm thử:

| Mức | Kiểm tra cái gì | Công cụ điển hình | Ở dự án này |
|---|---|---|---|
| Unit | Một hàm / một class | xUnit (BE) | Đã có ở Backend |
| Component | Một component riêng lẻ | Testing Library | Không dùng |
| **E2E / UI** | **Cả màn hình hoạt động như người dùng thấy** | **Playwright** | **Tài liệu này** |

Điểm mạnh của Playwright:

- **Auto-waiting:** trước mỗi thao tác, Playwright tự chờ phần tử *hiển thị, ổn định, bật (enabled), nhận được sự kiện*. Không cần `sleep()` rải rác, nên test ít "flaky".
- **Web-first assertions:** `expect(locator).toBeVisible()` tự **thử lại** cho tới khi đúng hoặc hết timeout.
- **Cô lập bằng BrowserContext:** mỗi test có một "hồ sơ trình duyệt" sạch (cookie, localStorage riêng), tạo trong vài mili-giây.
- **Chặn và giả lập mạng** (`page.route`): thay Backend bằng dữ liệu giả để test nhanh và lặp lại được.
- **Công cụ gỡ lỗi:** UI mode, Inspector, Trace Viewer (xem lại từng bước kèm ảnh chụp DOM và request), video, screenshot.
- **Đa trình duyệt:** Chromium, Firefox, WebKit, cùng một API.
- **Chạy song song** nhiều worker, tích hợp CI dễ dàng.

---

## 2. Quy trình hoạt động bên trong

```
┌───────────────────────┐   lệnh (JSON qua pipe/WebSocket)   ┌────────────────────────┐
│  Test runner (Node.js)│ ─────────────────────────────────▶ │ Trình duyệt (Chromium) │
│  đọc *.spec.ts        │                                    │  ┌──────────────────┐  │
│  chạy từng test       │ ◀───────────────────────────────── │  │ BrowserContext   │  │
│  (mỗi worker 1 tiến   │      sự kiện, kết quả, DOM         │  │  └─ Page (tab)   │  │
│   trình riêng)        │                                    │  │     └─ ứng dụng  │  │
└───────────────────────┘                                    │  └──────────────────┘  │
        │                                                    └────────────────────────┘
        ▼
  Reporter: list / html / github ,  trace, screenshot, video
```

Các bước khi gõ `pnpm test:e2e`:

1. **Đọc cấu hình** `playwright.config.ts`: thư mục test, projects, reporter, webServer, timeout…
2. **Khởi động web server** (`webServer`): build bản production của ứng dụng rồi phục vụ bằng `vite preview` ở cổng `5173` (đổi bằng `E2E_PORT`). Nếu cổng đã có server (và không ở CI) thì **dùng lại server đó** - xem lưu ý ở mục 6.3.
3. **Lập kế hoạch:** gom các file `*.spec.ts`, sắp thứ tự theo **dependency giữa các project** (`mock-setup` chạy trước `mock`, `setup` chạy trước `real-api`).
4. **Chia cho worker:** mỗi worker là một tiến trình Node riêng; mỗi worker mở một trình duyệt và, cho từng test, tạo một `BrowserContext` + `Page` mới (cô lập hoàn toàn).
5. **Chạy test:** mỗi lệnh `page.click(...)`, `locator.fill(...)` được gửi tới trình duyệt qua giao thức điều khiển (Chromium dùng **Chrome DevTools Protocol – CDP**). Playwright kiểm tra điều kiện *actionability* rồi mới thực hiện.
6. **Kiểm tra (assertion):** `expect(...)` truy vấn lại trạng thái trang, lặp cho đến khi thỏa hoặc quá `expect.timeout`.
7. **Dọn dẹp:** đóng context; nếu test hỏng thì giữ lại screenshot/video, nếu retry thì giữ trace.
8. **Báo cáo:** in kết quả ra terminal và tạo báo cáo HTML ở `e2e/.output/report`.

### Các khái niệm chính (dùng xuyên suốt dự án)

| Khái niệm | Ý nghĩa | Ví dụ trong dự án |
|---|---|---|
| **Locator** | Cách "tìm" phần tử, đánh giá lười (lúc dùng mới tìm) | `page.getByRole("button", { name: "Sign in" })` |
| **Fixture** | Tài nguyên được tiêm vào test, tự dựng và tự dọn | `page`, và fixture riêng `api` |
| **Project** | Một cấu hình chạy (trình duyệt, thiết bị, storageState) | `mock-setup`, `mock`, `setup`, `real-api` |
| **Dependencies** | Project phải chạy trước | `mock` phụ thuộc `mock-setup`; `real-api` phụ thuộc `setup` |
| **storageState** | Lưu cookie + localStorage để tái dùng phiên đăng nhập | `e2e/.auth/customer.json` |
| **Page Object Model** | Gói thao tác của một trang vào một class | `LoginPage`, `HorseFormPage`, `BookingFormPage` |
| **Network routing** | Chặn request và trả dữ liệu giả | `ApiMock` trong `e2e/support/api-mock.ts` |
| **Clock** | Điều khiển thời gian của trang | `page.clock.setFixedTime(...)` |

---

## 3. Cấu trúc thư mục

```
playwright.config.ts            Cấu hình Playwright
playwright.demo.config.ts       Cấu hình "demo": hiện trình duyệt, làm chậm thao tác
docs/PLAYWRIGHT.md              Tài liệu này
e2e/
├─ tsconfig.json                TypeScript riêng cho code test (strict)
├─ tests/
│  ├─ auth.setup.ts             Đăng nhập một lần, lưu phiên vào e2e/.auth/
│  ├─ login.spec.ts             Chức năng 1 – Đăng nhập        (LOGIN-01 … 16)
│  ├─ add-horse.spec.ts         Chức năng 2 – Thêm ngựa         (HORSE-01 … 19)
│  └─ create-booking.spec.ts    Chức năng 3 – Tạo booking       (BOOKING-01 … 22)
├─ real-api/                    Bộ smoke test gọi API THẬT (không mock)
│  ├─ auth.setup.ts             Đăng nhập thật một lần, lưu phiên vào playwright/.auth/user.json
│  ├─ login.real.spec.ts        REAL-LOGIN-01 … 03
│  ├─ add-horse.real.spec.ts    REAL-HORSE-01 … 02
│  ├─ create-booking.real.spec.ts  REAL-BOOKING-01
│  └─ support.ts                Tài khoản từ .env.e2e, dữ liệu duy nhất, hàm dọn dữ liệu
├─ pages/                       Page Object Model (dùng chung cho cả hai bộ)
│  ├─ login.page.ts
│  ├─ horse-form.page.ts
│  └─ booking-form.page.ts
├─ support/
│  ├─ api-mock.ts               Backend giả (chặn mạng, ghi lại request)
│  ├─ fixtures.ts               Fixture `api` dùng chung, đồng hồ cố định
│  ├─ fakes.ts                  Backend giả có trạng thái (danh sách ngựa có tìm kiếm/phân trang)
│  ├─ test-data.ts              Dữ liệu giả (phiên, ngựa, booking, địa điểm)
│  └─ ui.ts                     Hàm tiện ích (tìm toast)
├─ .auth/                       (git bỏ qua) phiên đăng nhập của bộ mock
└─ .output/                     (git bỏ qua) bản build, báo cáo, trace, video
playwright/.auth/user.json      (git bỏ qua) phiên đăng nhập THẬT của bộ real-api
.env.e2e.example                Mẫu biến môi trường của bộ real-api (copy thành .env.e2e, git bỏ qua)
```

---

## 4. Thiết kế bộ test (các quyết định có chủ đích)

### 4.1. Tách biệt hoàn toàn khỏi Backend (hermetic)

Vì yêu cầu là kiểm thử **Front-end**, mọi lời gọi `/api/v1/**` được chặn trong trình duyệt và trả bằng dữ liệu giả theo đúng *envelope* thật `{ isSuccess, code, message, value }`.

Hệ quả:

- Không cần Backend, mạng, hay tài khoản thật; **không bao giờ chạm vào môi trường dev đang triển khai**.
- Kết quả **ổn định, lặp lại được**; chạy nhanh.
- Có thể mô phỏng các tình huống khó tạo ở Backend thật (lỗi 409, 500, mất mạng, phản hồi chậm).
- Chặn luôn SignalR hub và mọi host ngoài `localhost` (kể cả Geoapify, được giả lập riêng).

Lớp `ApiMock` có ba tính chất:

1. **Hermetic:** request ra ngoài `localhost` bị chặn.
2. **Observable:** ghi lại mọi request (method, path, query, body) – test kiểm tra được **FE đã gửi gì**, không chỉ FE hiển thị gì (`api.calls(...)`, `api.lastBody(...)`).
3. **Strict:** gọi API không được khai báo → trả `501` và test **fail ở bước dọn dẹp**. FE không thể âm thầm phụ thuộc thêm một API mà test không biết.

### 4.2. Kiểm thử bản build production

`webServer` build ứng dụng (`vite build`) rồi chạy `vite preview`, thay vì dùng dev server. Lý do: dev server biên dịch ~1000 module theo yêu cầu (~15 giây mỗi lần mở trang), trong khi bản build tải trong vài giây và là **đúng mã sẽ được phát hành**. Bản build nằm ở `e2e/.output/dist`.

### 4.3. Đồng hồ cố định

Mọi test chạy với "hôm nay" = **29/10/2026** (`FIXED_NOW`), múi giờ UTC. Nhờ đó các quy tắc phụ thuộc thời gian của form booking là xác định:

- Chuyến nội địa Anh → Anh: khởi hành **≥ 21 ngày** kể từ hôm nay (từ 19/11/2026).
- Chuyến quốc tế: khởi hành **≥ 2 tháng** (từ 29/12/2026).
- Ngày sinh của ngựa không được ở tương lai, không quá 40 năm trước.

### 4.4. Đăng nhập một lần, dùng lại nhiều lần

`auth.setup.ts` đăng nhập **bằng form thật** (với API giả) và lưu `storageState`. Các spec thêm ngựa / tạo booking nạp phiên này nên không phải đăng nhập lại. Riêng `login.spec.ts` ghi đè để bắt đầu từ trạng thái *chưa đăng nhập*.

### 4.5. Dữ liệu

Chỉ dùng dữ liệu **tổng hợp** (`customer@e2e.test`, mật khẩu giả…). Không có tài khoản, token hay khóa thật nào trong mã nguồn test.

---

## 5. Các ca kiểm thử

### Chức năng 1 – Đăng nhập (`login.spec.ts`, 16 ca)

| Mã | Nội dung |
|---|---|
| LOGIN-01 | Hiển thị form và các liên kết |
| LOGIN-02 | Hiện / ẩn mật khẩu |
| LOGIN-03 | "Sign up", "Forgot password?" điều hướng đúng |
| LOGIN-04 | Form rỗng → thông báo lỗi từng trường, không gửi request |
| LOGIN-05 | Email sai định dạng bị từ chối |
| LOGIN-06 | Sửa đúng thì thông báo lỗi biến mất |
| LOGIN-07 | Đăng nhập thành công: payload đúng, toast, phiên được lưu, về trang chủ |
| LOGIN-08 | Nút hiển thị tiến trình và bị khóa khi đang gửi |
| LOGIN-09 | Logistics Manager được chuyển vào khu vực admin |
| LOGIN-10 | Sai thông tin: báo lỗi, ở lại trang, form dùng lại được |
| LOGIN-11 | Tài khoản chưa xác minh |
| LOGIN-12 | Tài khoản bị khóa |
| LOGIN-13 | Lỗi theo trường do server trả về |
| LOGIN-14 | Server không phản hồi (mất mạng) |
| LOGIN-15 | Chưa đăng nhập vào trang riêng tư → chuyển về `/login` |
| LOGIN-16 | Đăng nhập xong quay lại đúng trang đã yêu cầu |

### Chức năng 2 – Thêm ngựa (`add-horse.spec.ts`, 19 ca)

| Mã | Nội dung |
|---|---|
| HORSE-01/02 | Hiển thị đủ trường; bộ đếm ký tự hộ chiếu / microchip |
| HORSE-03 | Form rỗng liệt kê mọi trường bắt buộc, không gửi request |
| HORSE-04 | Tên toàn khoảng trắng coi như rỗng |
| HORSE-05 | Số hộ chiếu: đúng 15 ký tự chữ HOA hoặc số |
| HORSE-06 | Số microchip: đúng 15 chữ số |
| HORSE-07 | Cân nặng 20–1500 kg, chiều cao 50–220 cm, tối đa 1 chữ số thập phân |
| HORSE-08/09 | Ngày sinh không ở tương lai, không quá 40 năm |
| HORSE-10 | Tạo thành công: payload chính xác (đã trim, số là number, ngày ISO), toast, chuyển sang "My horses" và thấy ngựa mới |
| HORSE-11 | Trạng thái "Saving…", không bấm hai lần |
| HORSE-12 | Cancel không gửi gì |
| HORSE-17 | Tải ảnh đại diện: chạy đủ 3 bước tải lên có chữ ký (xin chữ ký → gửi ảnh lên kho ảnh → xác nhận), rồi `POST /horses` chỉ mang `avatar.publicId` |
| HORSE-18 | File không phải JPG/PNG bị từ chối, không gọi API nào |
| HORSE-19 | Xem ảnh đại diện toàn màn hình và phóng to |
| HORSE-13…16 | Lỗi 409 (trùng), 400 (validation server), 500, mất mạng; dữ liệu đã nhập được giữ lại |

### Chức năng 3 – Tạo booking (`create-booking.spec.ts`, 22 ca)

| Mã | Nội dung |
|---|---|
| BOOKING-01/02 | Màn hình ban đầu; bấm tiếp khi chưa nhập → báo thiếu điểm đón, điểm đến, ngày đi |
| BOOKING-03 | Tìm địa chỉ đặt điểm đón, rồi tự chuyển sang điểm đến |
| BOOKING-04/05 | Không có kết quả; địa chỉ ngoài 27 nước EU + Anh bị từ chối |
| BOOKING-06 | Cùng một quốc gia chỉ chấp nhận ở Anh |
| BOOKING-07/08 | Mốc ngày khởi hành tối thiểu (21 ngày nội địa, 2 tháng quốc tế) |
| BOOKING-09 | Ngày đến không trước ngày đi |
| BOOKING-10 | Cancel |
| BOOKING-11…15 | Bước 2: danh sách ngựa, chọn / bỏ / xóa hết, tìm kiếm gọi server, quay lại bước 1 giữ dữ liệu, ghi chú ≤ 500 ký tự |
| BOOKING-16 | Tạo thành công: payload `POST /bookings` chính xác, toast "Booking BK-… created", chuyển tới trang chi tiết, trạng thái **Pending** |
| BOOKING-17…19 | Đang lưu; lỗi 400 (giữ nguyên dữ liệu); mất mạng |
| BOOKING-21 | Ô "chọn tất cả ngựa" ở đầu bảng chọn / bỏ chọn mọi ngựa của trang |
| BOOKING-22 | Chuyến quốc tế Anh → Pháp: ngày sớm nhất là sau 2 tháng (28/12 bị khóa, 29/12 chọn được), payload mang đủ hai quốc gia |
| BOOKING-20 | Thêm ngựa mới ngay trong hộp thoại và tự được chọn |

> Booking vừa tạo ở trạng thái **PENDING**. Bước duyệt (Approve/Reject) là việc của Logistics Manager nên **không** nằm trong phạm vi.

---

## 6. Cài đặt và chạy

### 6.1. Yêu cầu

- Node.js 20+ và pnpm (như phần còn lại của dự án).
- Cài phụ thuộc rồi tải trình duyệt Chromium của Playwright (chỉ làm một lần):

```bash
pnpm install
pnpm exec playwright install chromium
```

### 6.2. Các cách chạy

| Mục đích | Lệnh |
|---|---|
| Chạy bộ **mock** (**headless**: trình duyệt chạy ngầm, không có cửa sổ, terminal chỉ in kết quả) | `pnpm test:e2e` hoặc `pnpm test:e2e:mock` |
| Chạy bộ **API thật** (cần `.env.e2e`, xem mục 11) | `pnpm test:e2e:real` |
| Bộ API thật trong **UI mode** để dễ gỡ lỗi | `pnpm test:e2e:real:ui` |
| **Demo** – mở cửa sổ trình duyệt và làm chậm từng thao tác (700 ms) để người xem theo dõi được; dùng khi thuyết trình | `pnpm test:e2e:demo` |
| **UI mode** – giao diện tương tác, xem từng bước, chạy lại từng test | `pnpm test:e2e:ui` |
| **Headed** – thấy cửa sổ trình duyệt chạy thật | `pnpm test:e2e:headed` |
| **Debug** – Playwright Inspector, chạy từng bước | `pnpm test:e2e:debug` |
| Mở báo cáo HTML của lần chạy trước | `pnpm test:e2e:report` |
| **Codegen** – ghi thao tác thành code test (cần `pnpm dev` ở cổng 5173) | `pnpm test:e2e:codegen` |
| Kiểm tra kiểu cho code test | `pnpm typecheck:e2e` |

> **Vì sao `pnpm test:e2e` không thấy trình duyệt?** Mặc định Playwright chạy *headless* (không giao diện) để nhanh và chạy được trên CI/server. Muốn quan sát: dùng `test:e2e:demo` (xem thật chậm), `test:e2e:headed` (xem ở tốc độ thật, rất nhanh), `test:e2e:ui` (xem lại từng bước kèm ảnh chụp trang) hoặc `test:e2e:debug` (dừng ở từng lệnh). Nên xem một bài cụ thể: `pnpm test:e2e:demo -g "BOOKING-16"`. Cấu hình demo nằm ở `playwright.demo.config.ts` (đổi `SLOW_MO_MS` để nhanh/chậm hơn).

Chạy một phần:

```bash
pnpm test:e2e login.spec.ts                       # một file
pnpm test:e2e -g "HORSE-10"                       # theo tên / mã test
pnpm test:e2e create-booking.spec.ts:195          # một test theo số dòng
pnpm test:e2e --project=mock                      # một project (mock, mock-setup, setup, real-api)
pnpm test:e2e --repeat-each=5                     # lặp để phát hiện test không ổn định
pnpm test:e2e --last-failed                       # chỉ chạy lại test hỏng lần trước
pnpm test:e2e --trace on                          # ghi trace cho mọi test
```

### 6.3. Biến môi trường

| Biến | Mặc định | Tác dụng |
|---|---|---|
| `E2E_SKIP_BUILD=1` | (tắt) | Bỏ qua bước build, dùng lại `e2e/.output/dist` khi chỉ sửa test (nhanh hơn rất nhiều). Lần chạy đầu hoặc sau khi sửa `src/` thì **không** đặt biến này |
| `E2E_PORT` | `5173` | Cổng của bộ mock. **Lưu ý:** nếu `pnpm dev` đang chạy ở cổng này thì bộ mock dùng lại chính dev server đó (chậm hơn bản build). Muốn tách riêng: `E2E_PORT=5199` |
| `PLAYWRIGHT_BASE_URL` | `http://localhost:5173` | Front-end mà bộ real-api mở (đặt trong `.env.e2e`) |
| `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` | – | Tài khoản CUSTOMER thật của bộ real-api (đặt trong `.env.e2e`) |
| `E2E_WORKERS` | `1` (local), `2` (CI) | Số trình duyệt chạy song song |
| `CI` | – | Bật chế độ CI: `retries: 2`, `forbidOnly`, reporter `github`, luôn dựng server mới |

Ví dụ: `E2E_SKIP_BUILD=1 E2E_WORKERS=4 pnpm test:e2e`.

> **Về số worker:** mặc định là 1 vì trên máy đang bận (nhiều ứng dụng nền) nhiều Chromium cùng tải ứng dụng có thể bị treo. Nếu máy rảnh và nhiều nhân CPU, tăng `E2E_WORKERS` để chạy nhanh hơn.

### 6.4. Đọc kết quả và gỡ lỗi

- Terminal: `✓` đạt, `✘` hỏng kèm thông điệp, locator, và ảnh chụp lỗi.
- **Báo cáo HTML:** `pnpm test:e2e:report`.
- **Trace Viewer:** khi test được retry (hoặc chạy với `--trace on`), mở bằng `pnpm exec playwright show-trace <file trace.zip>`. Trace cho xem từng bước, ảnh DOM trước/sau, request mạng và console.
- Screenshot và video của test hỏng nằm trong `e2e/.output/test-results/`.
- **Debug một test:** `pnpm test:e2e:debug -g "LOGIN-07"` hoặc thêm `await page.pause()` vào test.

---

## 7. Viết thêm một test

```ts
import { expect, test } from "../support/fixtures"
import { buildHorse, pagedValue } from "../support/test-data"

test("tên mô tả hành vi", async ({ api, page }) => {
  // 1. Arrange – khai báo backend giả
  api.ok("GET", "/horses", pagedValue([buildHorse()]))

  // 2. Act – thao tác như người dùng
  await page.goto("/my-horses")
  await page.getByRole("button", { name: "Actions for Golden Thunder" }).click()

  // 3. Assert – kiểm tra cái người dùng thấy VÀ cái FE đã gửi
  await expect(page.getByText("Golden Thunder")).toBeVisible()
  expect(api.calls("GET", "/horses")).toHaveLength(1)
})
```

API của `ApiMock` (qua fixture `api`):

| Hàm | Dùng để |
|---|---|
| `api.ok(method, path, value, status?, delayMs?)` | Trả thành công (value hoặc hàm sinh value từ request) |
| `api.fail(method, path, status, { errorCode, message, errors })` | Trả lỗi đúng định dạng của Backend |
| `api.networkError(method, path)` | Ngắt kết nối (mô phỏng mất mạng) |
| `api.calls(method, path)` | Danh sách request FE đã gửi |
| `api.lastBody(method, path)` | Body JSON của request gần nhất |
| `api.tolerateUndeclared(reply)` | Cho phép các API chưa khai báo (trang phụ không liên quan) |

**Nguyên tắc nên theo**

1. Tìm phần tử theo **vai trò và tên người dùng thấy** (`getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`) trước, tránh CSS/XPath dễ vỡ.
2. Không dùng `waitForTimeout` (sleep); hãy dùng assertion tự thử lại.
3. Mỗi test độc lập, tự khai báo dữ liệu mình cần.
4. Đặt thao tác lặp vào Page Object; để assertion trong file test.
5. Với thao tác ghi dữ liệu, luôn kiểm cả **payload FE gửi** lẫn **kết quả hiển thị**.

---

## 8. Chạy trên CI

Ví dụ GitHub Actions:

```yaml
name: e2e
on: [pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
        env: { CI: "true" }
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report, path: e2e/.output/report }
```

Khi `CI` được đặt, cấu hình tự bật `retries: 2`, `forbidOnly` (cấm lỡ để `test.only`), reporter `github`, và luôn dựng server mới.

---

## 9. Mở rộng

- **Thêm trình duyệt:** thêm project `firefox`/`webkit` vào `projects` (dùng `devices["Desktop Firefox"]`, `devices["Desktop Safari"]`), chạy `pnpm exec playwright install`.
- **Thêm thiết bị di động:** project dùng `devices["Pixel 7"]` hoặc `devices["iPhone 14"]`.
- **Thêm vai trò khác:** tạo thêm file setup (ví dụ `lm.setup.ts` lưu `e2e/.auth/lm.json`) và project tương ứng.
- **Kiểm thử trực quan:** `await expect(page).toHaveScreenshot()` để so sánh ảnh.
- **Kiểm tra khả năng truy cập:** kết hợp `@axe-core/playwright`.

---

## 10. Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Lần chạy đầu rất lâu | Đang build bản production (~1 phút). Lần sau dùng `E2E_SKIP_BUILD=1` nếu không đổi `src/` |
| Test hiển thị nội dung cũ sau khi sửa `src/` | Bản build cũ còn được dùng; bỏ `E2E_SKIP_BUILD`, hoặc xóa `e2e/.output/dist` |
| `Executable doesn't exist` | Chưa cài trình duyệt: `pnpm exec playwright install chromium` |
| `Port 5173 is already in use` | Đổi `E2E_PORT`, hoặc tắt tiến trình đang giữ cổng |
| Nhiều worker bị treo ở `page.goto` | Máy quá tải; giữ `E2E_WORKERS=1` |
| `API calls without a mock` | FE gọi một API chưa khai báo → thêm `api.ok(...)` cho đúng endpoint |
| Lỗi thiếu `VITE_API_URL` | Cấu hình đã có giá trị dự phòng; nếu tự chạy `vite build`, hãy đặt biến này |

---

## 11. Bộ smoke test gọi API thật (`real-api`)

Bộ **mock** chứng minh *Front-end xử lý đúng mọi phản hồi*. Bộ **real-api** trả lời câu hỏi còn lại: *Front-end và Backend thật có ghép với nhau chạy được không?* (đường dẫn API, định dạng dữ liệu, xác thực, luật ở server, kho ảnh...). Theo nguyên tắc kim tự tháp kiểm thử, bộ này chỉ chiếm phần nhỏ (10–20%): vài đường đi **quan trọng nhất**, không kiểm từng luật.

### 11.1. Khác bộ mock ở đâu

| | `mock` | `real-api` |
|---|---|---|
| Backend | Giả (`page.route`) | **Thật** + database thật |
| Front-end | Bản build production | Dev server (`pnpm dev`, dùng `VITE_API_URL` của `.env`) |
| Dữ liệu | Cố định, đồng hồ cố định | Tên duy nhất "E2E Smoke …", **ngày tính từ hôm nay thật** |
| Chạy song song | Có (`fullyParallel`) | **Không** (tuần tự, một database dùng chung) |
| Timeout | 60 s | 180 s (mạng thật, backend có thể khởi động nguội) |
| Phiên đăng nhập | `e2e/.auth/customer.json` (giả) | `playwright/.auth/user.json` (thật) |
| Nhiệm vụ | Mọi luật, mọi lỗi | Đường đi chính hoạt động |

### 11.2. Cài đặt

1. Chuẩn bị **một tài khoản CUSTOMER dành riêng cho test** trên backend đích (không dùng tài khoản cá nhân/production).
2. Copy `.env.e2e.example` thành `.env.e2e` (file này bị git bỏ qua) và điền:

```
PLAYWRIGHT_BASE_URL=http://localhost:5173
E2E_USER_EMAIL=<email tài khoản test>
E2E_USER_PASSWORD=<mật khẩu>
```

3. Chạy: `pnpm test:e2e:real` (hoặc `pnpm test:e2e:real:ui` để debug). Nếu `pnpm dev` đang chạy ở cổng 5173 thì được dùng lại và **không bị tắt**; nếu chưa chạy, Playwright tự bật rồi tắt.

Thiếu `.env.e2e` thì bước `setup` báo lỗi ngay, **không gọi mạng** và các test còn lại bị bỏ qua.

### 11.3. Các ca kiểm thử

| Mã | Nội dung |
|---|---|
| (setup) | Đăng nhập thật bằng form, kiểm tra tài khoản là CUSTOMER, lưu phiên |
| REAL-LOGIN-01 | Tài khoản không tồn tại bị từ chối: có thông báo lỗi, vẫn ở trang login, không lưu phiên (dùng email ngẫu nhiên, **không** thử sai mật khẩu của tài khoản thật để tránh bị khóa) |
| REAL-LOGIN-02 | Đăng nhập đúng: rời trang login, có toast "Signed in successfully.", phiên có token và `accountType = CUSTOMER` |
| REAL-LOGIN-03 | Chưa đăng nhập vào trang riêng tư thì bị chuyển về `/login` |
| REAL-HORSE-01 | Thêm ngựa mới (tên/hộ chiếu/microchip duy nhất): toast thành công, chuyển sang "My horses" |
| REAL-HORSE-02 | Tải lại trang: ngựa vẫn còn với dữ liệu đã nhập (đã thực sự lưu trong database) |
| REAL-BOOKING-01 | Tìm địa chỉ thật (Geoapify) London → Manchester, ngày đi +30 ngày, thêm ngựa ngay trong hộp thoại, tạo booking: toast "Booking … created", trang chi tiết hiện ngựa và trạng thái **Pending** |

### 11.4. Dọn dữ liệu

Test ghi dữ liệu thật nên **tự dọn** trong `afterAll`, bằng đúng thao tác người dùng: hủy booking (lý do "Automated smoke test clean-up."), rồi xóa ngựa. Dọn dẹp là *nỗ lực tối đa*: nếu thất bại, test **không bị fail** mà in cảnh báo `[real-api] clean-up failed, delete by hand: …` kèm tên cần xóa tay. Mọi dữ liệu test đều bắt đầu bằng **"E2E Smoke"**, dễ tìm. Thứ tự dọn: booking trước, ngựa sau (ngựa đang thuộc booking thì chưa xóa được).

### 11.5. Lưu ý an toàn

- Bộ này **ghi vào database thật** của backend mà `VITE_API_URL` trỏ tới. Chỉ chạy trên môi trường dev/staging và với tài khoản test.
- Không bao giờ commit `.env.e2e` hoặc `playwright/.auth/` (đã nằm trong `.gitignore`).
- Không chạy trong CI trừ khi đã cấu hình secret riêng và backend test riêng. Các lệnh `test:e2e*` mặc định chỉ chạy bộ **mock**, nên `pnpm test:e2e` không bao giờ chạm backend thật. Lệnh `playwright test` trần (không `--project`) chạy cả hai.
- Kết quả phụ thuộc mạng, backend (có thể "ngủ" lúc đầu) và dịch vụ bản đồ thật, nên bộ này có thể thất bại vì lý do ngoài Front-end. Bộ mock là nơi quyết định Front-end đúng hay sai.

### 11.6. Sự cố thường gặp của bộ real-api

| Hiện tượng | Cách xử lý |
|---|---|
| `Real-API tests need a CUSTOMER account...` | Chưa có `.env.e2e` hoặc thiếu `E2E_USER_EMAIL/PASSWORD` |
| `Real sign-in failed: "..."` | Sai mật khẩu, tài khoản chưa xác minh/bị khóa, hoặc backend đang khởi động: thử lại sau |
| `E2E_USER_EMAIL must be a CUSTOMER account` | Tài khoản không phải khách hàng (chỉ khách hàng thêm ngựa và tạo booking được) |
| Timeout ở ô tìm địa điểm | Khóa `VITE_GEOAPIFY_API_KEY` trong `.env` sai/hết hạn mức |
| Còn dữ liệu "E2E Smoke ..." | Bước dọn dẹp thất bại: hủy booking và xóa ngựa đó bằng tay |

---

## 12. Tham khảo

- Tài liệu chính thức: <https://playwright.dev/docs/intro>
- Best practices: <https://playwright.dev/docs/best-practices>
- Locators: <https://playwright.dev/docs/locators>
- Network mocking: <https://playwright.dev/docs/mock>
- Trace Viewer: <https://playwright.dev/docs/trace-viewer>
