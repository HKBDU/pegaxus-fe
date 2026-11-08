# Kịch bản demo Playwright

Tài liệu này chỉ phục vụ **buổi demo**: kịch bản theo từng bước và danh sách lệnh để copy. Giải thích chi tiết về Playwright, thiết kế bộ test và cách viết thêm test nằm ở [PLAYWRIGHT.md](./PLAYWRIGHT.md).

Mọi lệnh chạy ở thư mục gốc của Front-end (`NEW_PROJECT`).

---

## 1. Cách đọc bảng lệnh

Mỗi lệnh được ghi rõ 3 điều:

| Cột             | Giá trị     | Ý nghĩa                                                                                                                                  |
| --------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Trình duyệt** | `Headless`  | Chạy ngầm, **không có cửa sổ**. Terminal chỉ in kết quả.                                                                                 |
|                 | `Mở Chrome` | **Hiện cửa sổ** trình duyệt để người xem theo dõi.                                                                                       |
| **Kiểu chạy**   | `Tự chạy`   | Chạy các test **có sẵn** trong thư mục `e2e/`, không cần bạn thao tác.                                                                   |
|                 | `Gen code`  | **Ghi lại thao tác của bạn** rồi sinh ra code test. Không chạy test có sẵn.                                                              |
|                 | `Tương tác` | Bạn điều khiển từng bước (chạy lại, tạm dừng, xem timeline).                                                                             |
| **Dữ liệu**     | `Mock`      | Mọi lời gọi Backend bị chặn và trả dữ liệu giả ngay trong trình duyệt. Không cần Backend, không cần mạng, **không ghi gì vào database**. |
|                 | `API thật`  | Gọi **BE thật + DB thật**. Có ghi dữ liệu.**                                                                                             |

---

## 2. Bảng tra nhanh: lệnh nào làm gì

### 2.1. Chạy test tự động

| Lệnh                      | Trình duyệt                              | Kiểu chạy | Dữ liệu      | Dùng khi                                                       |
| ------------------------- | ---------------------------------------- | --------- | ------------ | -------------------------------------------------------------- |
| `pnpm test:e2e`           | Headless                                 | Tự chạy   | Mock         | Chạy cả bộ 58 test, xem kết quả `✓` / `✘` trong terminal       |
| `pnpm test:e2e:demo`      | **Mở Chrome**, chậm 1400 ms mỗi thao tác | Tự chạy   | Mock         | **Lệnh demo chính**: người xem thấy form được gõ, nút được bấm |
| `pnpm test:e2e:headed`    | **Mở Chrome**, tốc độ thường             | Tự chạy   | Mock         | Muốn thấy cửa sổ nhưng không cần chậm                          |
| `pnpm test:e2e:real`      | Headless                                 | Tự chạy   | **API thật** | Kiểm tra FE ghép với BE thật (có ghi dữ liệu)                  |
| `pnpm test:e2e:real:demo` | **Mở Chrome**, chậm 1400 ms              | Tự chạy   | **API thật** | Demo chạy với Backend thật, người xem thấy từng thao tác       |

### 2.2. Công cụ tương tác

| Lệnh                    | Trình duyệt                                                            | Kiểu chạy                  | Dữ liệu                        | Dùng khi                                                      |
| ----------------------- | ---------------------------------------------------------------------- | -------------------------- | ------------------------------ | ------------------------------------------------------------- |
| `pnpm test:e2e:ui`      | Mở cửa sổ **UI mode** của Playwright (trình duyệt chạy trong khung đó) | Tương tác                  | Mock                           | Bấm chạy từng test, xem timeline, ảnh DOM trước/sau từng bước |
| `pnpm test:e2e:real:ui` | Mở cửa sổ UI mode                                                      | Tương tác                  | **API thật**                   | Như trên nhưng với Backend thật                               |
| `pnpm test:e2e:debug`   | **Mở Chrome** + cửa sổ Inspector                                       | Tương tác (chạy từng bước) | Mock                           | Dừng ở từng dòng lệnh để giải thích                           |
| `pnpm test:e2e:report`  | Mở trang báo cáo HTML trong trình duyệt                                | Chỉ xem                    | – (xem kết quả lần chạy trước) | Mở báo cáo sau khi chạy xong                                  |

### 2.3. Gen code

| Lệnh                    | Trình duyệt                               | Kiểu chạy    | Dữ liệu                      | Dùng khi                                                         |
| ----------------------- | ----------------------------------------- | ------------ | ---------------------------- | ---------------------------------------------------------------- |
| `pnpm test:e2e:codegen` | **Mở Chrome** + cửa sổ Inspector đang ghi | **Gen code** | **API thật** (không có mock) | Bạn bấm trên web, code test hiện ra bên cạnh theo thời gian thực |

> Chi tiết hai cách gen code (codegen, debug + Record) ở mục 5.
>
> **Codegen cần `pnpm dev` đang chạy ở cổng 5173** (nó mở `http://localhost:5173`). Vì chạy trên dev server nên các thao tác gọi Backend thật theo `.env`: đừng bấm Tạo/Xóa trên tài khoản thật nếu không muốn có dữ liệu mới.

### 2.4. Chạy một phần (thêm vào sau bất kỳ lệnh nào ở 2.1)

| Lệnh                                           | Tác dụng                                             |
| ---------------------------------------------- | ---------------------------------------------------- |
| `pnpm test:e2e:demo -g "LOGIN-07"`             | Chạy **đúng một test** theo mã, mở Chrome chậm, mock |
| `pnpm test:e2e:demo login.spec.ts`             | Chạy **một file** spec, mở Chrome chậm, mock         |
| `pnpm test:e2e -g "HORSE"`                     | Mọi test có chữ `HORSE`, headless, mock              |
| `pnpm test:e2e:real:demo -g "REAL-HORSE"`      | Chỉ phần thêm ngựa với API thật, mở Chrome chậm      |
| `pnpm test:e2e:real:demo -g "REAL-BOOKING-01"` | Chỉ ca tạo booking với API thật, mở Chrome chậm      |
| `pnpm typecheck:e2e`                           | Kiểm tra kiểu cho code test (không chạy trình duyệt) |

> Với PowerShell, chuỗi có khoảng trắng hoặc dấu `|` phải bọc trong dấu nháy, ví dụ `-g "LOGIN-07"`. Mã không có khoảng trắng như trên thì dùng được cả hai.

---

## 3. Cách chạy lệnh trên terminal (đọc kỹ nếu chưa quen)

### 3.1. Cần mấy cửa sổ terminal, và quy tắc về cổng 5173

Trong cùng thư mục dự án:

| Terminal       | Việc                                                                    | Khi nào                                 |
| -------------- | ----------------------------------------------------------------------- | --------------------------------------- |
| **Terminal 2** | Gõ mọi lệnh Playwright (`pnpm test:e2e:demo ...`)                       | Cả buổi demo                            |
| **Terminal 1** | Chạy `pnpm dev` (web ở `http://localhost:5173`). **Để yên, không tắt.** | **Chỉ từ phần của người 5** (xem mục 4) |

**Quy tắc về cổng 5173** (quan trọng nhất của mục này):

- **Bộ mock (người 1 đến 4): cổng 5173 phải trống, không chạy `pnpm dev`.** Playwright tự dựng bản **build** của web ở cổng 5173 (nhanh) và tự tắt khi lệnh xong.
- Nếu `pnpm dev` đang chạy ở 5173, Playwright **dùng luôn** dev server đó. Dev server chậm vì phải biên dịch khoảng 1000 module cho mỗi trang mới. Đã thử trên máy này với 4 worker: 8 trong 16 test Login quá thời gian ở bước `page.goto`. Cùng 16 test trên bản build thì chạy xong trong 32 đến 60 giây tùy số worker (xem phần Workers).
- **Gen code trên API thật (`test:e2e:codegen`) và bộ API thật (người 5) cần web chạy bằng `pnpm dev`**, vì web phải gọi Backend thật theo `.env`. Với bộ API thật, nếu cổng trống thì Playwright tự bật dev server, nhưng trang đầu tiên rất chậm; bật `pnpm dev` và mở thử một lần trước sẽ ổn hơn.

### 3.2. Từng bước

1. **Mở terminal.** Trong VS Code bấm `Ctrl + \`` (phím cạnh số 1), hoặc mở PowerShell. Nếu terminal chưa ở thư mục dự án thì gõ: `cd F:\SWP\FE\NEW_PROJECT`.
2. **Kiểm tra cổng 5173 trống** (để chạy bộ mock): gõ `Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue`. Không in ra gì là trống. Nếu in ra một dòng thì có chương trình đang giữ cổng (thường là `pnpm dev`): bấm `Ctrl + C` ở cửa sổ đang chạy nó.
3. **Terminal 2:** gõ `$env:E2E_SKIP_BUILD=1` một lần (chỉ sau khi đã build một lần, xem mục 3.4).
4. **Terminal 2:** copy một lệnh từ bảng ở mục 4, dán vào, nhấn Enter. Ví dụ: `pnpm test:e2e:demo -g "LOGIN-07"`.
5. **Chờ.** Cửa sổ Chrome tự mở và tự thao tác (với lệnh `demo`). Terminal 2 **bị chiếm** cho tới khi lệnh xong, đó là bình thường.
6. **Xong:** terminal in `1 passed` (đạt) hoặc `failed` (hỏng), rồi trả lại dấu nhắc lệnh để bạn gõ lệnh kế tiếp.

### 3.3. Dừng và đóng đúng cách

| Tình huống                             | Cách làm                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| Muốn dừng lệnh đang chạy               | Bấm `Ctrl + C` trong **Terminal 2**                                                   |
| Lệnh có Inspector (`debug`, `codegen`) | **Đóng cửa sổ Chrome** hoặc bấm Resume. Đừng để mở quá lâu, vì lệnh đang chờ          |
| Muốn tắt web chạy bằng `pnpm dev`      | `Ctrl + C` trong **Terminal 1** (hết phần của người 5, hoặc khi cần chạy lại bộ mock) |

**Không** chạy hai lệnh Playwright cùng lúc ở hai terminal: chúng dùng chung thư mục kết quả nên có thể kẹt nhau. Đóng lệnh trước rồi mới chạy lệnh sau.

### 3.4. Chuẩn bị trước buổi demo (làm một lần)

1. `pnpm install` rồi `pnpm exec playwright install chromium` (tải trình duyệt của Playwright).
2. Tắt `pnpm dev` nếu đang chạy (cổng 5173 phải trống), rồi build và chạy thử một test: `pnpm test:e2e -g "LOGIN-01"`. Lệnh này build **cả ứng dụng** (Đăng nhập, Thêm ngựa, Tạo booking đều nằm trong bản build), bản build nằm ở `e2e/.output/dist`. `-g "LOGIN-01"` chỉ chọn một test nhanh để chạy thử, không giới hạn phần được build. Lần này mất thêm thời gian build.
3. Lúc demo, ở Terminal 2 gõ một lần:

```
$env:E2E_SKIP_BUILD=1
```

**`E2E_SKIP_BUILD` làm gì:** mỗi lần chạy lệnh Playwright mà cổng 5173 trống, Playwright build lại ứng dụng rồi mới chạy test. Đặt biến này thì Playwright **bỏ bước build** và dùng luôn bản ở `e2e/.output/dist`, nên mỗi lệnh khởi động nhanh hơn. Không bắt buộc, chỉ để người trình bày khỏi chờ build ở mỗi lượt.

- Chỉ có tác dụng trong cửa sổ terminal đã gõ nó. Mở terminal mới thì gõ lại. Bỏ biến: `Remove-Item Env:E2E_SKIP_BUILD`. Trong Git Bash: `export E2E_SKIP_BUILD=1`; trong cmd: `set E2E_SKIP_BUILD=1`.
- Chỉ đặt **sau** khi đã build ở bước 2. Chưa có bản build thì không có gì để phục vụ; bản build cũ thì test chạy trên code cũ.
- Nếu sửa code web (`src`) sau khi build, bỏ biến (hoặc mở terminal mới) và chạy lại bước 2 để build bản mới.

### 3.5. Chỉ cần nếu demo phần **API thật** (người 5)

1. Có tài khoản CUSTOMER dành riêng cho test và điền `PLAYWRIGHT_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` trong `.env` hoặc `.env.e2e` (file bị git bỏ qua; không đưa giá trị này lên màn hình khi demo).
2. Backend free host có thể "ngủ": mở thử web một lần trước buổi demo để đánh thức nó.
3. Tắt các cửa sổ Chrome khác và chiếu màn hình **đúng một** cửa sổ để người xem không bị rối.

---

## 4. Kịch bản demo: 5 người x 5 phút = 25 phút

Mỗi người giữ **một chức năng** và chạy **lệnh của mình**. Chỉ dùng **một máy, một cửa sổ chiếu**. Thứ tự đi từ "nhanh và chắc" (mock) đến "thật nhất" (API thật), nên nếu mạng hoặc Backend có sự cố thì phần quan trọng đã xong.

> Các lệnh chạy ở **Terminal 2**. Từ người 1 đến người 4, cổng 5173 **phải trống** (không chạy `pnpm dev`) và đã gõ `$env:E2E_SKIP_BUILD=1` (mục 3.4). Đến phần người 5 mới bật `pnpm dev`.
>
> Mọi lệnh của bộ mock (`test:e2e`, `demo`, `headed`, ...) chạy thêm một bước **đăng nhập một lần** (`mock-setup`) trước test bạn chọn, nên với lệnh `demo` sẽ thấy Chrome mở đăng nhập một lần rồi mới tới test. Bình thường, không phải lỗi.

| Người | Phút      | Chủ đề                                                  | Dữ liệu           |
| ----- | --------- | ------------------------------------------------------- | ----------------- |
| 1     | 0 đến 5   | Mở đầu và chạy cả bộ test                               | Mock              |
| 2     | 5 đến 10  | Chức năng Đăng nhập **và Workers (chạy song song)**     | Mock              |
| 3     | 10 đến 15 | Chức năng Thêm ngựa **và Sharding (chỉ nói lý thuyết)** | Mock              |
| 4     | 15 đến 20 | Chức năng Tạo booking và công cụ gỡ lỗi                 | Mock              |
| 5     | 20 đến 25 | Gen code, API thật, kết luận                            | Mock rồi API thật |

### Người 1 (0 đến 5 phút): mở đầu và chạy cả bộ

| Việc               | Lệnh                   | Trình duyệt / Kiểu / Dữ liệu      |
| ------------------ | ---------------------- | --------------------------------- |
| Chạy cả bộ 58 test | `pnpm test:e2e`        | Headless / Tự chạy / Mock         |
| Mở báo cáo HTML    | `pnpm test:e2e:report` | Mở trang báo cáo / Chỉ xem / Mock |

- Nói: Playwright mở trình duyệt thật và thao tác như người dùng. Có 2 bộ: **mock** (FE đúng với mọi phản hồi, không cần BE, không ghi database) và **API thật** (FE ghép được với BE).
- Vừa chạy vừa giải thích sơ đồ (PLAYWRIGHT.md mục 2). Cho xem `✓` trong terminal rồi báo cáo HTML, nhóm theo 3 chức năng (Login, Add horse, Create booking).
- Dự phòng: cả bộ chưa xong kịp thì mở báo cáo của lần chạy trước và nói "đây là kết quả lần chạy gần nhất".

### Người 2 (5 đến 10 phút): Đăng nhập

| Việc                 | Lệnh                               | Trình duyệt / Kiểu / Dữ liệu     |
| -------------------- | ---------------------------------- | -------------------------------- |
| Đăng nhập thành công | `pnpm test:e2e:demo -g "LOGIN-07"` | Mở Chrome, chậm / Tự chạy / Mock |
| Đăng nhập sai        | `pnpm test:e2e:demo -g "LOGIN-10"` | Mở Chrome, chậm / Tự chạy / Mock |

- Cho xem: email và mật khẩu được gõ, nút đổi trạng thái, trang chủ mở. Test còn kiểm tra payload gửi lên và phiên được lưu.
- Với ca sai: báo lỗi, vẫn ở trang login, form dùng lại được. Nhấn mạnh test cả **đường lỗi**, không chỉ đường vui.
- Nếu còn thời gian: nói về 16 ca Login (form rỗng, email sai định dạng, tài khoản bị khóa, mất mạng).

### Workers (có demo)

**Lý thuyết (nói nhanh):**

- **Worker** là một tiến trình chạy test. Nhiều worker thì chạy nhiều test cùng lúc **trên một máy**.
- Mỗi worker chiếm: **1 tiến trình Node** (chạy code test) và **1 trình duyệt Chromium**, rồi mỗi test mở **1 context** (như một cửa sổ ẩn danh) trong trình duyệt đó. Việc tải trang và chạy JavaScript của web ngốn **CPU**, còn mỗi trình duyệt giữ **RAM** riêng.
- Vì vậy tài nguyên tăng gần như tỉ lệ với số worker:

| Số worker | Cùng lúc có                 | Chiếm tài nguyên                 |
| --------- | --------------------------- | -------------------------------- |
| 1         | 1 Node + 1 Chromium, 1 test | ít nhất, chạy lần lượt từng test |
| 2         | 2 Node + 2 Chromium, 2 test | khoảng gấp đôi                   |
| 3 hoặc 4  | 3 hoặc 4 bộ như trên        | khoảng gấp 3 hoặc 4              |

- Con số CPU (bao nhiêu %) và RAM (bao nhiêu MB) **chưa đo**. Hãy mở **Task Manager** (Ctrl + Shift + Esc, tab Processes hoặc Details, tìm `chrome` và `node`) lúc chạy và đọc số thật cho người xem.
- Nhiều worker hơn chưa chắc nhanh hơn. Trên máy này (Intel Core i7-4710HQ: 4 nhân, 8 luồng, RAM 16 GB) đã đo: từ 1 lên 2 worker nhanh gần gấp đôi (60 giây xuống 32 giây), nhưng 3 và 4 worker không nhanh hơn 2 worker (35 giây và 33 giây). Nhiều khả năng CPU đã hết chỗ (đây là suy luận, chưa đo CPU: xác nhận bằng Task Manager). File cấu hình của dự án cũng ghi lại việc máy này từng bị đứng khi chạy nhiều Chromium cùng lúc, nên mặc định chỉ để 1 worker.

**Demo (chạy ngầm, so sánh thời gian):** chạy lần lượt 4 lệnh, ghi lại dòng cuối `(xx s)` của mỗi lần. Mỗi lệnh tự chạy bước đăng nhập chuẩn bị (`mock-setup`) rồi mới tới 16 ca Login.

```
pnpm test:e2e --reporter=list -g "LOGIN-" --workers=1
pnpm test:e2e --reporter=list -g "LOGIN-" --workers=2
pnpm test:e2e --reporter=list -g "LOGIN-" --workers=3
pnpm test:e2e --reporter=list -g "LOGIN-" --workers=4
```

Cả 4 lệnh chạy 16 ca Login và chỉ khác số worker.

| Số worker | Thời gian 16 ca Login | CPU / RAM đọc từ Task Manager |
| --------- | --------------------- | ----------------------------- |
| 1         | 60 giây               | (điền khi tập)                |
| 2         | 32 giây               | (điền khi tập)                |
| 3         | 35 giây               | (điền khi tập)                |
| 4         | 33 giây               | (điền khi tập)                |

Thời gian trên đo bằng lệnh cũ có `--no-deps` (bỏ qua bước đăng nhập chuẩn bị). Chạy theo lệnh mới thì mỗi lần cộng thêm vài giây của bước này, nên tập lại và cập nhật bảng.

**Demo nhìn thấy (tùy chọn):** mở 3 cửa sổ Chrome cùng lúc, mỗi cửa sổ một test. Chạy chậm vì mỗi thao tác đợi 1400 ms.

```
pnpm test:e2e:demo --workers=3 -g "LOGIN-0[1-3]"
```

Lưu ý khi chạy phần này:

- Cổng 5173 phải **trống** (không chạy `pnpm dev`) để Playwright dùng bản build nhanh. Nếu `pnpm dev` đang ở 5173, Playwright dùng luôn dev server đó, mỗi trang tải rất chậm và nhiều worker sẽ quá thời gian (đã gặp ở 4 worker).
- Nên đã build một lần và gõ `$env:E2E_SKIP_BUILD=1` (mục 3.4), nếu không mỗi lệnh sẽ build lại trước khi chạy.
- Thử 2, rồi 3, rồi 4. Dừng ngay (`Ctrl + C`) nếu thấy máy đứng, và nói rõ đó chính là giới hạn phần cứng.

### Người 3 (10 đến 15 phút): Thêm ngựa

| Việc                | Lệnh                               | Trình duyệt / Kiểu / Dữ liệu     |
| ------------------- | ---------------------------------- | -------------------------------- |
| Tạo ngựa thành công | `pnpm test:e2e:demo -g "HORSE-10"` | Mở Chrome, chậm / Tự chạy / Mock |
| Tải ảnh đại diện    | `pnpm test:e2e:demo -g "HORSE-17"` | Mở Chrome, chậm / Tự chạy / Mock |

- HORSE-10: điền form, tạo, toast, chuyển sang "My horses" và **thấy ngựa mới** (mock có trạng thái nhỏ: POST lưu, GET trả lại).
- HORSE-17: tải ảnh qua 3 bước ký chữ ký (xin chữ ký, gửi ảnh, xác nhận); test kiểm `POST /horses` chỉ mang `avatar.publicId`.
- Nhắc các luật được test: hộ chiếu 15 ký tự HOA hoặc số, microchip 15 chữ số, cân nặng 20 đến 1500 kg, ngày sinh không ở tương lai.

### Sharding (nói lý thuyết, k demo)

Lý do không chạy: trên **một máy** sharding vẫn tốn CPU và RAM y như worker, nên không thấy nhanh hơn. Phải có **nhiều máy** mới thấy lợi, mà demo dùng nhiều máy bất tiện.

- **Shard** là chia bộ test thành các phần, mỗi **máy** chạy một phần. Worker chia việc **trong một máy**, còn shard chia việc **giữa nhiều máy**.
- Mỗi máy lại có thể chạy nhiều worker, nên hai thứ cộng lại:

```
số trình duyệt chạy cùng lúc = số máy (shard) x số worker mỗi máy
```

- Ví dụ dùng 3 máy, mỗi máy 4 worker, thì 12 trình duyệt chạy cùng lúc mà không máy nào bị quá tải:

```
Máy 1: pnpm test:e2e --shard=1/3 --workers=4 --reporter=blob
Máy 2: pnpm test:e2e --shard=2/3 --workers=4 --reporter=blob
Máy 3: pnpm test:e2e --shard=3/3 --workers=4 --reporter=blob
```

- `--shard=1/3` nghĩa là "tôi là phần 1 trong 3 phần". Với bộ mock này, mỗi phần có 20 test (đã kiểm bằng `--list`; mỗi phần tự có thêm một bước đăng nhập chuẩn bị).
- **Gộp báo cáo:** mỗi máy chạy với `--reporter=blob` để xuất ra một file báo cáo thô (thư mục `blob-report`). Sau đó gom các file đó của cả 3 máy vào một thư mục (trên CI là bước tải artifact về) rồi gộp thành **một báo cáo HTML duy nhất** bằng lệnh có sẵn của Playwright:

```
pnpm exec playwright merge-reports --reporter html ./all-blob-reports
```

- Chốt lại: **worker** để tận dụng hết một máy, **shard** để thêm máy khi một máy không còn đủ, và **merge-reports** để mọi kết quả về cùng một báo cáo.

### Người 4 (15 đến 20 phút): Tạo booking và gỡ lỗi

| Việc                         | Lệnh                                 | Trình duyệt / Kiểu / Dữ liệu      |
| ---------------------------- | ------------------------------------ | --------------------------------- |
| Tạo booking                  | `pnpm test:e2e:demo -g "BOOKING-16"` | Mở Chrome, chậm / Tự chạy / Mock  |
| Chuyến quốc tế Anh sang Pháp | `pnpm test:e2e:demo -g "BOOKING-22"` | Mở Chrome, chậm / Tự chạy / Mock  |
| Xem từng bước, gỡ lỗi        | `pnpm test:e2e:ui`                   | Cửa sổ UI mode / Tương tác / Mock |

- BOOKING-16: tìm địa chỉ, chọn ngày, chọn ngựa, tạo, trang chi tiết hiện **Pending**.
- BOOKING-22: ngày khởi hành sớm nhất là sau 2 tháng cho chuyến quốc tế (nội địa là 21 ngày). Đây là luật nghiệp vụ được khóa bằng test.
- UI mode: bấm chạy một test, kéo timeline xem ảnh trang trước và sau từng bước, xem request đã bị chặn. Giải thích đây là cách tìm lỗi khi test hỏng.

### Người 5 (20 đến 25 phút): gen code, API thật, kết luận

**Chuẩn bị (trước khi bắt đầu phần này):** đợi lệnh Playwright của người 4 chạy xong hẳn (cổng 5173 được trả lại), rồi ở **Terminal 1** gõ `pnpm dev`. Đợi dòng `Local: http://localhost:5173/` (đúng cổng 5173, không phải 5174) và mở web một lần trên trình duyệt để web "nóng" (lần đầu biên dịch mất 30 giây trở lên). Cả hai việc của người 5 đều cần dev server này.

| Việc                       | Lệnh                                            | Trình duyệt / Kiểu / Dữ liệu                    |
| -------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| Gen code trên **API thật** | `pnpm test:e2e:codegen` (cần `pnpm dev` ở 5173) | Mở Chrome + Inspector / **Gen code** / API thật |
| Smoke test **API thật**    | `pnpm test:e2e:real:demo -g "REAL-LOGIN-02"`    | Mở Chrome, chậm / Tự chạy / **API thật**        |

- Gen code (khoảng 2 phút): Chrome mở `http://localhost:5173` cùng cửa sổ Inspector đang ghi. Bấm vài thao tác trên web (mở trang đăng nhập, bấm liên kết), code Playwright hiện ngay. Đừng bấm Tạo/Xóa vì đang gọi BE thật. Nói rõ: codegen chỉ sinh **khung thao tác**; test chính thức còn phải thêm kiểm tra (assert) và dữ liệu giả.
- API thật (khoảng 2 phút): chạy **một** ca đăng nhập thật cho nhanh (`REAL-LOGIN-02`).
- Kết luận (khoảng 1 phút): mock quyết định FE đúng, API thật xác nhận ghép với BE; hai bộ bổ sung cho nhau.

---

## 5. Gen code: hai cách và khác nhau thế nào

|                          | `test:e2e:codegen`                      | `test:e2e:debug` rồi bấm Record                |
| ------------------------ | --------------------------------------- | ---------------------------------------------- |
| Dữ liệu                  | **API thật** (không có mock)            | **Mock** (test có sẵn đã cài mock)             |
| Trang bắt đầu            | `http://localhost:5173`, chưa đăng nhập | Dừng ở dòng test bạn chọn                      |
| Cần `pnpm dev`           | Có (cổng 5173)                          | Không (dùng bản build, cổng 5173 trống)        |
| Ghi dữ liệu vào database | Có thể (nếu bạn bấm Tạo/Xóa)            | Không bao giờ                                  |
| Khi nào dùng             | Muốn thử trên Backend thật              | Muốn ghi tiếp từ giữa một test có sẵn, an toàn |

---

## 6. Lệnh phụ (khi có câu hỏi từ người xem)

| Việc                                         | Lệnh                                                                                  | Trình duyệt / Kiểu / Dữ liệu             |
| -------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- |
| Chạy một test và dừng ở từng dòng            | `pnpm test:e2e:debug -g "LOGIN-07"`                                                   | Mở Chrome + Inspector / Tương tác / Mock |
| Lặp một test 5 lần để tìm test không ổn định | `pnpm test:e2e -g "LOGIN-07" --repeat-each=5`                                         | Headless / Tự chạy / Mock                |
| Chỉ chạy lại test hỏng lần trước             | `pnpm test:e2e --last-failed`                                                         | Headless / Tự chạy / Mock                |
| Ghi trace cho mọi test                       | `pnpm test:e2e --trace on`                                                            | Headless / Tự chạy / Mock                |
| Mở file trace đã ghi                         | `pnpm exec playwright show-trace <đường-dẫn>/trace.zip`                               | Mở cửa sổ Trace Viewer / Chỉ xem         |
| Chạy song song 4 trình duyệt (máy rảnh)      | Bash: `E2E_WORKERS=4 pnpm test:e2e` · PowerShell: `$env:E2E_WORKERS=4; pnpm test:e2e` | Headless / Tự chạy / Mock                |
| Liệt kê toàn bộ test mà không chạy           | `pnpm exec playwright test --list --project=mock`                                     | Không mở trình duyệt / Chỉ liệt kê       |

Chỉnh tốc độ của các lệnh `demo`: sửa `SLOW_MO_MS` (mặc định `1400`) trong `playwright.demo.config.ts`. Số nhỏ hơn thì chạy nhanh hơn.

## 7. Nên và không nên khi demo

- **Nên** mở bằng bộ mock (người 1 đến 4): nhanh, ổn định, không phụ thuộc mạng và Backend.
- **Nên** để phần API thật ở cuối, và có sẵn phương án quay về mock nếu Backend không phản hồi.
- **Không** để `pnpm dev` chạy ở 5173 khi chạy bộ mock (người 1 đến 4): Playwright sẽ dùng dev server chậm và nhiều test quá thời gian.
- **Không** bấm Tạo/Xóa trong cửa sổ codegen nếu không muốn sinh dữ liệu thật.
