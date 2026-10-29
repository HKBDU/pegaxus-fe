# Kiểm thử end-to-end phía Front-end với Playwright

Tài liệu này mô tả cách Playwright được tích hợp vào dự án **Pegaxus Front-end** (React + Vite + TypeScript), nguyên lý hoạt động của Playwright, cách chạy bộ test và cách viết thêm test mới.

- **Phạm vi:** chỉ Front-end. Backend đã có unit test riêng nên không kiểm thử ở đây.
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
2. **Khởi động web server** (`webServer`): build bản production của ứng dụng rồi phục vụ bằng `vite preview` ở cổng `5199`. Nếu cổng đã có server (và không ở CI) thì dùng lại.
3. **Lập kế hoạch:** gom các file `*.spec.ts`, sắp thứ tự theo **dependency giữa các project** (`setup` chạy trước `chromium`).
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
| **Project** | Một cấu hình chạy (trình duyệt, thiết bị, storageState) | `setup`, `chromium` |
| **Dependencies** | Project phải chạy trước | `chromium` phụ thuộc `setup` |
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
│  ├─ add-horse.spec.ts         Chức năng 2 – Thêm ngựa         (HORSE-01 … 16)
│  └─ create-booking.spec.ts    Chức năng 3 – Tạo booking       (BOOKING-01 … 20)
├─ pages/                       Page Object Model
│  ├─ login.page.ts
│  ├─ horse-form.page.ts
│  └─ booking-form.page.ts
├─ support/
│  ├─ api-mock.ts               Backend giả (chặn mạng, ghi lại request)
│  ├─ fixtures.ts               Fixture `api` dùng chung, đồng hồ cố định
│  ├─ fakes.ts                  Backend giả có trạng thái (danh sách ngựa có tìm kiếm/phân trang)
│  ├─ test-data.ts              Dữ liệu giả (phiên, ngựa, booking, địa điểm)
│  └─ ui.ts                     Hàm tiện ích (tìm toast)
├─ .auth/                       (git bỏ qua) phiên đăng nhập đã lưu
└─ .output/                     (git bỏ qua) bản build, báo cáo, trace, video
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

### Chức năng 2 – Thêm ngựa (`add-horse.spec.ts`, 16 ca)

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
| HORSE-13…16 | Lỗi 409 (trùng), 400 (validation server), 500, mất mạng; dữ liệu đã nhập được giữ lại |

### Chức năng 3 – Tạo booking (`create-booking.spec.ts`, 20 ca)

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
| Chạy toàn bộ (**headless**: trình duyệt chạy ngầm, không có cửa sổ, terminal chỉ in kết quả) | `pnpm test:e2e` |
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
pnpm test:e2e --project=chromium                  # một project
pnpm test:e2e --repeat-each=5                     # lặp để phát hiện test không ổn định
pnpm test:e2e --last-failed                       # chỉ chạy lại test hỏng lần trước
pnpm test:e2e --trace on                          # ghi trace cho mọi test
```

### 6.3. Biến môi trường

| Biến | Mặc định | Tác dụng |
|---|---|---|
| `E2E_SKIP_BUILD=1` | (tắt) | Bỏ qua bước build, dùng lại `e2e/.output/dist` khi chỉ sửa test (nhanh hơn rất nhiều). Lần chạy đầu hoặc sau khi sửa `src/` thì **không** đặt biến này |
| `E2E_PORT` | `5199` | Cổng phục vụ bản build |
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
| `Port 5199 is already in use` | Đổi `E2E_PORT`, hoặc tắt tiến trình đang giữ cổng |
| Nhiều worker bị treo ở `page.goto` | Máy quá tải; giữ `E2E_WORKERS=1` |
| `API calls without a mock` | FE gọi một API chưa khai báo → thêm `api.ok(...)` cho đúng endpoint |
| Lỗi thiếu `VITE_API_URL` | Cấu hình đã có giá trị dự phòng; nếu tự chạy `vite build`, hãy đặt biến này |

---

## 11. Tham khảo

- Tài liệu chính thức: <https://playwright.dev/docs/intro>
- Best practices: <https://playwright.dev/docs/best-practices>
- Locators: <https://playwright.dev/docs/locators>
- Network mocking: <https://playwright.dev/docs/mock>
- Trace Viewer: <https://playwright.dev/docs/trace-viewer>
