# PEGAXUS — Báo cáo sửa UI D01–D06 của Dương

Ngày: **19/10/2026**, theo ngày phiên làm việc của người dùng.

**SOURCE VERIFIED — NOT VISUALLY VERIFIED.** Không chạy trình duyệt, automated tests hoặc API mutation. `FIXED` bên dưới chỉ xác nhận source và kiểm tra tĩnh, không phải nghiệm thu UI/E2E.

## 1. Git snapshot và phạm vi

| Nội dung      | Trước sửa                                            | Sau sửa                                                                     |
| ------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Branch        | `feat/119-fix-ui/ux-issues`                          | Không đổi                                                                   |
| HEAD          | `63dba126d32995f169e634e4dab2f05e53eb2d40`           | Không đổi                                                                   |
| Working tree  | Sạch; không có staged, unstaged hoặc untracked files | 11 tracked files sửa; 2 untracked files: helper UI và báo cáo này           |
| Staging       | Trống                                                | Trống                                                                       |
| Git mutations | Không thực hiện                                      | Không stage/commit/push/pull/merge/rebase/reset/restore/stash/switch branch |

Ownership đối chiếu `../pegaxus-document/screen/flow2-frontend-task-assignment.md`: Dương phụ trách UC-20–25 và khung chi tiết dossier; Uyên phụ trách UC-19/30/31; Khuyên sở hữu shared file viewer/presigned utilities. Vì vậy không suy luận mọi file dưới `dossier` đều được phép sửa. Với Flow 6 chỉ sửa Invoice Filters và Status History, không đụng form tạo/sửa, issue/payment hoặc mutation tài chính.

Không thay đổi Backend, router/sidebar, Booking, RoutePlan, Fleet/Personnel, DossierRequirementsTab, shared component, package/lockfile, env hoặc auth. Không tạo viewer/picker mới. Transport Plan không có diff trong lượt này.

## 2. Trạng thái D01–D06

| Mã  | Trạng thái                                        | Nguyên nhân xác định từ source                                                                                                                                                                                | Kết quả / giới hạn                                                                                                                                                       |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D01 | **BLOCKED**                                       | `TransportPlanMetadataForm` dùng shared DatePicker cho ngày, nhưng giờ/phút vẫn qua Radix Select. Không tìm thấy `date-picker-09`, `@ss-components` hoặc TimePicker tương thích trong source/package hiện tại | Chưa sửa; không chạy shadcn/install và không tự dựng giải pháp thay thế. Cần cung cấp component được duyệt hoặc cho phép bổ sung dependency/component                    |
| D02 | **FIXED** — source                                | Shared uploader đã tự upload khi chọn file; dialog lại bắt bấm Confirm trước khi submit DocumentVersion. Một số FormMessage chỉ xuất hiện khi lỗi nên làm thay đổi chiều cao field                            | Bỏ Confirm; khóa snapshot các file upload thành công tại lần submit cuối. Giữ mutation/validation/retry/guards. Dành sẵn vùng thông báo lỗi trong các form thuộc phạm vi |
| D03 | **FIXED** — source                                | Các chip số liệu dùng flex với chiều rộng thay đổi, `dd` chưa reset margin; nhãn và số dễ lệch                                                                                                                | Grid compact, padding/radius/typography nhất quán, số không co lại, nhãn xuống dòng. Không đổi số liệu, công thức tiến độ hoặc palette trạng thái                        |
| D04 | **FIXED** — source                                | Caller chỉ đưa một slide vào ImageViewer nên viewer ẩn nút Previous/Next theo API của nó                                                                                                                      | Caller truyền bộ ảnh của cùng DocumentVersion; dùng nguyên shared viewer cho arrows, thumbnail, keyboard và chỉ số. Giữ PDF/fallback riêng; không sửa viewer             |
| D05 | **FIXED** — source                                | Một open request có thể xuất hiện ở alert chính, comments header và review history; revision form còn lặp comment trùng request                                                                               | Giữ một summary chính; comments không lặp summary của chính open request. Review lịch sử vẫn đầy đủ trong mục mở rộng; comment khác nội dung vẫn hiển thị                |
| D06 | **NOT VERIFIED** — đã sửa phần text thuộc phạm vi | Flex/grid thiếu khả năng co `min-w-0`; chuỗi không có dấu cách cần `overflow-wrap:anywhere`. Dropdown lỗi cuộn chưa có bằng chứng browser; K3 Audit History thuộc Uyên                                        | Sửa wrapping trong document/version/request và invoice history. Không tuyên bố đã sửa dropdown hoặc page-wide overflow thực tế; bàn giao K3/shared bên dưới              |

## 3. D01 — Picker và thời gian

Đã đọc `src/shared/components/ui/date-picker.tsx`, Calendar/Popover/Select và `src/features/transport-plan/components/TransportPlanMetadataForm.tsx`. Shared DatePicker hiện chỉ nhận ngày. Create/Edit dùng chung metadata form; giờ/phút đang là Select, đúng kiểu tương tác QA muốn bỏ.

Không có component đề xuất sẵn để reuse. Lệnh `pnpm dlx shadcn@latest add @ss-components/date-picker-09` **không được chạy** vì yêu cầu cần phê duyệt riêng. Không đổi datetime parsing, local display, ISO/UTC mapping, required/range rules, concurrency hoặc endpoints để né blocker UI.

Handoff: xác nhận component nguồn, API props và quyền thêm/generate; sau đó kiểm cả Create/Edit, ngày sát nửa đêm, mở lại form và conversion local → ISO. Mọi kiểm tra timezone/keyboard/mobile vẫn chưa thực hiện runtime.

## 4. D02 — Upload và validation ổn định

### Upload trước/sau

- Trước: chọn file → shared FileUploader tự upload → bấm Confirm khóa file list → submit metadata/DocumentVersion.
- Sau: chọn file → shared FileUploader tự upload → submit metadata/DocumentVersion. Không còn bước Confirm riêng.
- `submitValid` vẫn kiểm eligibility, validateUploadedAssets, `pending`, `noRetry` và synchronous submit guard. Chỉ sau khi form/file hợp lệ mới khóa snapshot completed uploads bằng ref/state, rồi gọi mutation hiện có.
- Sau khi khóa, callback upload đến muộn không sửa snapshot. Uploader unmount hủy phần upload còn dở như hành vi khóa trước đây. UI nói rõ đợi mọi file mong muốn ở trạng thái Uploaded; file chưa hoàn thành không được đưa vào DocumentVersion.
- Nếu mutation thất bại, giữ completed snapshot để retry submit hoặc chọn lại file; không tự upload lần hai và không tự submit/approve toàn dossier. Storage retry vẫn do FileUploader hiện có xử lý trước submit.
- Không sửa shared uploader/hook/API, quyền Customer/TS, backend errors, version lifecycle hoặc giới hạn file. `schemas.ts` chỉ đổi câu lỗi còn nhắc Confirm, không đổi Zod rule.

Giới hạn tích hợp đã biết: shared uploader chưa expose trạng thái tổng hợp mọi file đang upload. Vì vậy submit có thể dùng completed subset trong lúc còn upload khác; không tuyên bố đã thêm cơ chế “chỉ submit khi tất cả hoàn thành”. Cần QA kiểm rõ copy và race này; muốn thay rule phải thống nhất API shared với Khuyên.

### Vùng thông báo lỗi

`DossierFormMessage` là adapter nhỏ, chỉ trong feature, reuse `FormMessage/useFormField`. Vùng cao cố định 40px giữ chỗ hai dòng; lỗi dài hơn có scroll và keyboard focus, không cắt bỏ nội dung. Áp dụng cho document metadata, reject và missing-document request. Server field errors vẫn đi qua `form.setError` hiện có.

`InvoiceDateRange` giữ sẵn vùng lỗi hai dòng để các nút Apply/Clear không dịch khi range không hợp lệ; không đổi filter/URL/pagination. Transport Plan hiện đã có vùng `min-h-5`; các form review/revoke/comment dùng empty guard/footer/toast được đọc nhưng không có thay đổi suy đoán. Invoice write forms và form đồng đội nằm ngoài phạm vi. Chưa xác minh nhiều lỗi đồng thời hoặc nhiều dòng trên thiết bị thực tế.

## 5. D03–D06 — Hiển thị và tích hợp viewer

### Overall Progress

`DossierOverview` chuyển nhóm số liệu sang hai cột, ba cột từ breakpoint `sm`, dùng chung spacing, `min-h-7`, radius 2px và `leading-4`. Reset margin `dd`, giữ số tabular và không co; nhãn được wrap thay vì cắt. Màu lấy nguyên `dossierStatusStyles`; không thay enum hoặc tính lại tiến độ từ UI.

### Bộ ảnh trong cùng version

`DocumentFilesPreview` nhóm các JPG/PNG đủ giới hạn preview thành một lựa chọn Images; files được sort theo sortOrder như trước. Viewer dùng chung của Khuyên tại `src/shared/components/file-viewer/ImageViewer.tsx` đã hỗ trợ nhiều slides, Prev/Next, thumbnails và keyboard; caller cũ chỉ truyền một ảnh nên không có navigation.

Caller mới truyền ảnh cùng DocumentVersion vào viewer, với title `i / N · filename`, alt và download đúng từng slide. Viewer giữ hành vi vòng ở đầu/cuối hiện có; không tự tạo index/arrow implementation. PDF, định dạng không hỗ trợ và ảnh có metadata vượt giới hạn preview 5 MiB vẫn mở riêng với fallback/Open File; không để ảnh cũ quá lớn chặn gallery hợp lệ.

Protected fetch vẫn dùng Axios/auth và `getProtectedPreviewPath` hiện có. Mỗi file tạo object URL sau khi nhận Blob; abort/revoke khi đổi collection, lỗi hoặc unmount. Không đưa token/raw remote URL vào viewer. Nếu một ảnh trong gallery không tải được/Blob không hợp lệ, cả collection hiện lỗi + Retry, không giả báo tải thành công; retry tải lại collection. Đây là lựa chọn tích hợp hiện tại, cần QA với expired link/401/403 và ảnh hỏng. Không bổ sung API preview/presigned mới.

### Rejection và lịch sử

- `DocumentRevisionNotice`: chỉ bỏ previous review comment khi result REJECTED và nội dung trim trùng request message; nội dung khác vẫn giữ.
- `DocumentDetailsDialog`: giữ alert open request và mọi action cũ; comments của request đó chỉ còn heading gọn, không lặp alert. Closed/historical request giữ summary riêng.
- `DocumentVersionHistory`: toàn bộ review/reviewer/time/reason nằm trong mục Review history mở được. Với document REJECTED không có openRequest, review của version đầu danh sách được mở mặc định để không ẩn lý do duy nhất.
- Request/comments/version filenames và InvoiceStatusHistory thêm min-width/wrapping phù hợp; không đổi history events, thứ tự, timestamps, permissions hoặc queries.

### Dropdown và ownership chưa giải quyết

| Nơi cần QA / owner                                                                                                  | Bằng chứng / bàn giao                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uyên — `src/features/dossier/components/AuditTimeline.tsx`                                                          | UC-31/K3 không thuộc Dương. Source GRID có các cột tối thiểu cố định `15rem 15rem 13rem 12rem` từ `xl`; note chưa có wrapping dành chuỗi dài. Có nguy cơ vượt chiều rộng vùng chứa, nhưng chưa tái hiện browser; không sửa |
| Uyên — `src/features/dossier/components/AuditFilters.tsx`, `src/features/dossier/pages/DossierAuditHistoryPage.tsx` | Filter dùng shared DataTableRadioFilter. Cần reproduce chính xác dropdown/viewport/keyboard, sau đó owner sửa caller nếu lỗi thuộc K3                                                                                      |
| Shared owner — `src/shared/components/ui/data-table-radio-filter.tsx`                                               | List có `max-h-72 overflow-y-auto`; chưa chứng minh popup fit available viewport trong trường hợp QA. Không tự sửa shared hoặc gán nguyên nhân chắc chắn                                                                   |
| Shared owner — `src/shared/components/ui/select.tsx`, `dropdown-menu.tsx`                                           | Content đã portal, giới hạn available height và scroll. Chưa đủ bằng chứng phải sửa shared positioning/focus; không thêm workaround z-index/overflow toàn cục                                                              |

Không có bằng chứng memory leak. Text overflow được xử lý riêng với lifecycle object URL; không đồng nhất hai vấn đề.

## 6. File map / diff cuối

| File                                                                | Component / thay đổi                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/features/dossier/components/DocumentFilesPreview.tsx`          | Caller gallery/protected resources; reuse shared ImageViewer                        |
| `src/features/dossier/components/DocumentRequestAlert.tsx`          | Co/wrap alert và heading                                                            |
| `src/features/dossier/components/DocumentRequestComments.tsx`       | `showRequestSummary` mặc định true; caller có thể bỏ summary trùng; wrap text       |
| `src/features/dossier/components/DocumentSubmissionDialog.tsx`      | Bỏ Confirm, khóa file snapshot khi submit; ổn định lỗi; tránh lặp rejection comment |
| `src/features/dossier/components/DocumentVersionHistory.tsx`        | Review history mở rộng; một current-request summary; wrap filenames/dialog          |
| `src/features/dossier/components/DossierOverview.tsx`               | Metric badge grid, kích thước và alignment                                          |
| `src/features/dossier/components/RejectDocumentDialog.tsx`          | Reuse vùng FormMessage ổn định                                                      |
| `src/features/dossier/components/RequestMissingDocumentsDialog.tsx` | Reuse vùng FormMessage ổn định                                                      |
| `src/features/dossier/schemas.ts`                                   | Chỉ error copy từ Confirm → Upload; nguyên validation                               |
| `src/features/invoice/components/InvoiceFilters.tsx`                | Chỗ giữ lỗi date range                                                              |
| `src/features/invoice/components/InvoiceStatusHistory.tsx`          | Co/wrap timeline content/actor/reason                                               |
| `src/features/dossier/components/DossierFormMessage.tsx`            | File mới: adapter FormMessage scoped, không sửa shared                              |
| `PEGAXUS_DUONG_UI_FIX_REPORT.md`                                    | File mới: báo cáo này                                                               |

11 tracked files sửa + 2 file mới, không xóa/rename file. `git diff` chưa gồm nội dung untracked helper/report; hai file mới được đọc riêng. Đã rà từng diff: không đổi DTO/endpoints/query keys, role guards, legal state machine, datetime mapping; schema chỉ một dòng copy. Không có diff trong shared hoặc feature đồng đội. Lệnh tái kiểm: `git -c core.safecrlf=false diff --stat`, `git -c core.safecrlf=false diff`, `git status --short`.

## 7. Verification

Dùng trực tiếp tooling đã cài trong node_modules, không Corepack download/cài package. Không chạy tests, production build hoặc browser. Các kiểm tra TypeScript cuối được thực hiện sau thay đổi gallery size guard.

| Lệnh / kiểm tra                                                                                          | Kết quả                                                                                                              |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `& ./node_modules/.bin/tsc.cmd --project tsconfig.app.json --noEmit --incremental false --pretty false`  | PASS, exit 0                                                                                                         |
| `& ./node_modules/.bin/tsc.cmd --project tsconfig.node.json --noEmit --incremental false --pretty false` | PASS, exit 0                                                                                                         |
| `& ./node_modules/.bin/oxlint.cmd $uiFiles`                                                              | Exit 0; 0 errors, 1 warning có sẵn ở RequestMissingDocumentsDialog:150, `react(incompatible-library)` / `form.watch` |
| `& ./node_modules/.bin/prettier.cmd --write $uiFiles`                                                    | PASS; chỉ format 12 source files liệt kê, không format cả feature                                                    |
| `& ./node_modules/.bin/prettier.cmd --check $uiFiles PEGAXUS_DUONG_UI_FIX_REPORT.md`                     | PASS, exit 0; All matched files use Prettier code style                                                              |
| `git -c core.safecrlf=false diff --check`                                                                | PASS, exit 0 sau code changes và khi hoàn thiện báo cáo                                                              |
| `git diff --cached --name-only`                                                                          | Trống                                                                                                                |

Để tái chạy scope hiện tại trong PowerShell:

```powershell
$uiFiles = @(
  git -c core.safecrlf=false diff --name-only -- '*.ts' '*.tsx'
) + @('src/features/dossier/components/DossierFormMessage.tsx')
& ./node_modules/.bin/tsc.cmd --project tsconfig.app.json --noEmit --incremental false --pretty false
& ./node_modules/.bin/tsc.cmd --project tsconfig.node.json --noEmit --incremental false --pretty false
& ./node_modules/.bin/oxlint.cmd $uiFiles
& ./node_modules/.bin/prettier.cmd --check $uiFiles PEGAXUS_DUONG_UI_FIX_REPORT.md
git -c core.safecrlf=false diff --check
git status --short
```

Cảnh báo form.watch đã được đối chiếu bằng `git show HEAD:src/features/dossier/components/RequestMissingDocumentsDialog.tsx`; API watch tồn tại trước task. Không refactor form để che warning. `$uiFiles` dựa trên working tree sạch ban đầu của phiên này; nếu có thay đổi mới ngoài task, cần khoanh lại explicit scope trước khi dùng.

## 8. Manual visual QA còn lại

Chưa thực hiện checklist sau; chỉ dùng account/quyền thật và dữ liệu development được phép. Không tự chạy mutation trong task này.

1. D01: sau khi component được duyệt, kiểm cả Create/Edit, keyboard, local date/time và payload ISO, kể cả sát nửa đêm. Hiện UX hour/minute Select vẫn chưa được sửa.
2. Upload: chọn file hợp lệ phải upload ngay, không Confirm; kiểm một/nhiều file, upload lỗi/retry/remove, submit khi metadata sai, submit nhanh liên tiếp, đóng dialog, pending upload, mutation lỗi rồi retry/chọn lại. Đối chiếu completed subset và không có DocumentVersion/dossier approval ngoài ý muốn.
3. Validation: trạng thái đầu, single/multiple errors, sửa hết lỗi, server field errors; so sánh vị trí control trước/sau trên dialog desktop và mobile. Thử thông báo dài >2 dòng: đọc được và scroll bằng keyboard. Kiểm focus ring, label/aria association.
4. Progress: 320/360/390px và desktop; status counts thật, số lớn/nhãn dài, badge không cắt/co méo. So sánh progress trước/sau không đổi.
5. Preview: zero/one/multiple images, mixed PDF, ảnh legacy vượt 5 MiB, ảnh lỗi/permission denied; thứ tự/i-N/Prev/Next/đầu-cuối/keyboard/download phải đúng version. Đổi version/đóng dialog trong khi tải không để viewer cũ hoặc object URL lỗi.
6. Rejection: request trùng review comment chỉ một primary summary; comment khác vẫn thấy; REJECTED không openRequest vẫn có lý do dễ tìm. Mở toàn review/request lịch sử, reviewer/time/status/actions Customer/TS không mất.
7. History: IDs/filenames/emails/reasons rất dài, có/không dấu cách; kiểm cards/dialog không gây page-wide scroll. Với K3/dropdown, phối hợp Uyên/shared owner ghi viewport, popup, focus, wheel/keyboard và screenshot trước khi sửa.

## 9. Giới hạn và bước tiếp theo

- D01 cần component/approval; không báo FIXED. D06 dropdown cần browser evidence và ownership; không báo toàn bộ history/scroll FIXED.
- D02–D05 đạt source/static, vẫn **NOT VISUALLY VERIFIED**. Typecheck/lint không chứng minh browser layout, gallery keyboard hoặc network races đã PASS.
- Giữ nguyên giới hạn upload FE hiện tại 5 MiB/file và 10 files. Nếu tài liệu U1 còn ghi 10 MB, đây là discrepancy sẵn có cần owner/BE xác nhận riêng, không tự nới restriction trong task UI.
- `RULESET.md` có regex branch không cho slash phụ trong phần tên; branch hiện tại đã có `/` sau `fix-ui`. Không rename/switch; team lead quyết định trước PR nếu áp dụng rule này.
- Không có screenshot, browser log, authenticated API result hoặc QA acceptance được tạo trong lượt này. Không tuyên bố runtime fixed.

## Handoff ngắn cho ChatGPT / phiên tiếp theo

- FE HEAD `63dba126d32995f169e634e4dab2f05e53eb2d40`, branch `feat/119-fix-ui/ux-issues`; kiểm status và giữ 13 files hiện tại, không stage/commit/reset/restore.
- Chỉ D01–D06. D02 bỏ Confirm nhưng giữ final DocumentVersion submit/guards/completed-file snapshot; không thay thành auto-submit dossier. D04 dùng shared viewer nhiều slides, bảo vệ protected fetch/object URL và giữ fallback.
- D05 chỉ deduplicate current summary; historical reviews nằm trong details, không được xóa dữ liệu/reviewer. D03/counts và invoice queries không đổi.
- D01 BLOCKED vì component đề xuất chưa có; cần approval trước install/generate. D06 text source đã xử lý; K3 UC-31 của Uyên/shared dropdown không sửa khi chưa có phép và evidence.
- TypeScript PASS; lint 0 errors/1 pre-existing warning; không tests/build/browser/API mutation. Hoàn tất manual QA trước khi coi UI được nghiệm thu.

## 10. Follow-up — DatePicker, all-files upload và Audit History Note

Ngày: **19/10/2026**. Phần này cập nhật kết luận theo acceptance mới; các mục phía trên là lịch sử lượt trước, không phải trạng thái hoàn thành của follow-up.

### 10.1. Snapshot và kế hoạch đã thực hiện

| Nội dung    | Bằng chứng phiên follow-up                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Branch      | `feat/119-fix-ui/ux-issues`                                                                                             |
| HEAD        | `4c44161bc7ae279315a917ea3e6699a44af39cf2` — `fix: :lipstick: Refine document workflows and history layouts (#119)`     |
| Trước audit | Working tree sạch; báo cáo và helper của lượt trước đã nằm trong HEAD hiện tại                                          |
| Sau audit   | Chỉ báo cáo này thay đổi; không có source/dependency/generated files mới hoặc staged files                              |
| Quyền mới   | Được tải/cài đúng DatePicker được chỉ định, không được đoán registry URL; shared uploader và UC-31 vẫn cần owner đồng ý |

Đã đọc lại báo cáo, Git, components.json, package.json/lockfile, shared DatePicker/Calendar/Popover, TransportPlanMetadataForm và form mapping. Đã trace FileUploader → useFileUploader → callbacks → DocumentSubmissionDialog; kiểm các consumers. Đã đọc AuditTimeline, AuditFilters, DossierAuditHistoryPage và đối chiếu lại ownership UC-31 trong tài liệu phân công.

Kế hoạch: xác minh registry bằng dry-run trước mọi generated change; chỉ triển khai uploader/table khi có quyền owner; nếu không, giữ nguyên source và giao rõ thay đổi tối thiểu. Không coi lịch sử từng implementation của Dương là quyền sửa code hiện thuộc teammate.

### 10.2. Trạng thái mới — chưa đạt nghiệm thu

| Issue | Trạng thái trước                                         | Trạng thái mới                                                                             | Phần còn thiếu                                                                                                                              |
| ----- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| D01   | BLOCKED vì chưa được cài component                       | **BLOCKED BY CONTRACT** — thiếu mapping registry được xác nhận, không phải lỗi DTO Backend | Dry-run lỗi Unknown registry; chưa nhận được item/source nên chưa thể kiểm dependencies, overwrite hoặc UX time controls                    |
| D02   | FIXED ở việc bỏ Confirm, còn cho submit completed subset | **BLOCKED BY SHARED OWNER** — API hiện tại không đủ xác nhận toàn bộ selected set          | Cần Khuyên duyệt shared API trạng thái/khóa snapshot; chưa đạt điều kiện tất cả files thành công và metadata hợp lệ trước khi enable Submit |
| D06   | NOT VERIFIED; phần text tài liệu/hóa đơn đã sửa trước đó | **BLOCKED BY SHARED OWNER** — cụ thể cần Uyên đồng ý cho UI UC-31                          | Đã xác định layout Note/Details chính xác; chưa áp dụng thay đổi vào AuditTimeline                                                          |

Tất cả: **RUNTIME NOT VERIFIED — NOT VISUALLY VERIFIED**. Không có issue nào trong D01/D02/D06 được đánh dấu completed hoặc SOURCE FIXED trong lượt này. Không sửa lại D03–D05.

### 10.3. D01 — Kết quả registry thực tế

Đã chạy đúng lệnh yêu cầu từ workspace:

```powershell
pnpm dlx shadcn@latest add @ss-components/date-picker-09 --dry-run
```

CLI tải vào cache dlx, phiên chạy resolve **shadcn 4.22.0**, sau đó **exit 1**:

```text
Unknown registry "@ss-components". Make sure it is defined under "registries" in your components.json or package.json file:
{
  "registries": {
    "@ss-components": "[URL_TO_REGISTRY]"
  }
}
```

`components.json` hiện không có thuộc tính registries; package.json cũng không khai báo registry namespace này. Alias ui đã trỏ `@/shared/components/ui`, nhưng alias không thay thế registry mapping.

Không đoán URL, không dùng registry khác, không downgrade CLI theo gợi ý lỗi, không chạy install không-dry-run. Không có source DatePicker được generate, không ghi đè shared DatePicker, không thay components.json/package.json/pnpm-lock.yaml. Dependencies của CLI trong dlx cache **không phải** dependencies mới của ứng dụng. Dependencies thực sự của registry item và việc item có time picker hay không: **chưa xác minh được**.

Cần người dùng/owner cung cấp mapping `@ss-components` chính xác hoặc cấu hình đã được duyệt. Sau đó chạy lại dry-run, đọc toàn bộ item và dependencies/overwrites, rồi mới install. TransportPlanMetadataForm vẫn giữ shared DatePicker + Radix hour/minute Select, không được báo UX mới đã có.

Đã kiểm source `transport-plan.form.ts`: Create/Update chuyển chuỗi local bằng `new Date(...).toISOString()`; `planToForm` dùng `toLocalDateTime`; range guard vẫn giữ. Không sửa code nên không có thay đổi conversion trong follow-up; đây không phải kiểm thử runtime timezone/midnight.

### 10.4. D02 — Bằng chứng thiếu authoritative snapshot

| Source / điểm nối                                                      | Hành vi thực tế                                                                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/components/file-uploader/types.ts:3`                       | UploadStatus có queued/uploading/success/error. Retry quay lại queued; Remove loại khỏi items                                               |
| `src/shared/components/file-uploader/types.ts:16`                      | FileUploaderProps chỉ có onUploaded, onChange(publicIds), onError, onReject; không có callback full queue hoặc imperative snapshot/lock API |
| `src/shared/components/file-uploader/useFileUploader.ts:94–109`        | successIds chỉ lấy item success có publicId; effect onChange phụ thuộc successKey, bỏ qua initial render                                    |
| `src/shared/components/file-uploader/useFileUploader.ts:116`           | addFiles thêm queued items. Khi thêm file B trong lúc A đã success, successKey vẫn có thể chỉ là A và không phát onChange mới               |
| `src/shared/components/file-uploader/useFileUploader.ts:43,158`        | Remove/retry sửa items nội bộ. onError báo một lỗi không đủ biết mọi failed/remaining item sau Remove/Retry                                 |
| `src/shared/components/FileUploader.tsx:31`                            | Component nhận items nhưng không expose chúng cho caller; UI Retry/Remove do shared component điều khiển                                    |
| `src/features/dossier/components/DocumentSubmissionDialog.tsx:207–229` | Caller nhớ uploaded asset results và chỉ map success IDs thành files; không biết intended selected set đầy đủ                               |
| `src/features/dossier/components/DocumentSubmissionDialog.tsx:272,799` | submitValid/disabled hiện kiểm completed files và guards, chưa kiểm toàn queue; vẫn có thể submit A trong lúc B đang upload                 |

**Quan trọng:** nguy cơ completed subset vẫn còn trong source hiện tại. Không tự coi callback success cuối cùng, files.length, timeout, DOM inspection hoặc MutationObserver là bằng chứng tất cả files đã sẵn sàng. Không tạo fake aggregate state hoặc tự tạo upload machinery khác.

#### Handoff Khuyên — đề xuất shared API tối thiểu, CHƯA TRIỂN KHAI

Files cần owner duyệt:

- `src/shared/components/file-uploader/types.ts`
- `src/shared/components/file-uploader/useFileUploader.ts`
- `src/shared/components/FileUploader.tsx`

Consumers trực tiếp đã tìm thấy: Dossier DocumentSubmissionDialog; `src/features/authority/components/RecordAuthoritySubmissionDialog.tsx` và `UpdateAuthorityReviewDialog.tsx`. Không đổi semantics onChange/onUploaded hiện tại của các consumers đó. Quarantine page có comment nhắc FileUploader nhưng không phải một direct JSX consumer trong kết quả scan hiện tại.

Đề xuất cụ thể để owner duyệt, không phải API đã có:

1. Thêm callback optional `onStateChange(snapshot)` với toàn bộ **remaining selection** theo id ổn định/order, status và publicId đã xác nhận. Snapshot phải immutable, có revision/session identity; phát cả initial empty, add/queued, uploading, success/error, retry và remove, không chỉ successKey.
2. Caller cần đọc snapshot **hiện hành đồng bộ tại submit**, không chỉ một bản sao React state/effect có thể trễ. Có thể bổ sung optional imperative handle `getSnapshot()` và `lockCompletedSelection(expectedRevision)`; thao tác lock chỉ trả snapshot khi current revision khớp và mọi remaining item success + identifier hợp lệ, rồi khóa add/remove/retry cho attempt đó.
3. Snapshot/ref phải cập nhật cùng transition nguồn; callback trong useEffect đơn thuần không loại bỏ cửa sổ stale giữa add/remove/retry và submit. Không chỉ thêm optional prop ở type mà bỏ qua cập nhật thực sự trong hook.
4. Session/generation và removed-item checks phải ngăn late callbacks của upload cũ tái đưa file vào selection mới hoặc phát trạng thái sai. Giữ abort/cleanup/retry sẵn có; không upload lại success items khi retry một lỗi khác.
5. Các props/API mới optional, không đổi defaults của consumers khác; không tự mở rộng disabled semantics toàn shared khi chưa owner duyệt.

Sau shared API mới, caller mới có thể triển khai đúng predicate:

```text
canSubmit = authorized + eligible + valid metadata
            + authoritative remaining selection nonempty
            + every remaining item successful with valid uploaded asset
            + snapshot IDs/order match finalized asset set
            + no queued/uploading/retrying/failed item
            + no pending mutation/request attempt
```

Tại submit: lấy/lock snapshot cuối, validate metadata/files lại, freeze complete set cho attempt và gọi đúng DocumentVersion mutation. Nếu lock/revision/validation thất bại thì không mutation. Gắn callback theo dialog-session identity, bỏ callbacks cũ sau close/new session. Mutation thất bại giữ frozen successful set để retry, hoặc Choose files again tạo selection/session mới. Metadata-only save không cần tạo DocumentVersion. Không auto-submit/approve dossier, không Confirm riêng.

UI counts như `2 of 3 files uploaded`, failed/retry/remove và Ready chỉ được render từ snapshot thật. Khi metadata invalid, Submit vẫn disabled; form validation vẫn hiển thị lỗi qua vùng giữ chỗ hiện có.

**Caller-side work trong lượt này:** đã kiểm các guards, schema và completed snapshot; không có API hiện hữu đủ để nối predicate trên một cách an toàn. Không sửa caller thành một phiên bản giả “all ready”, cũng không tự khóa vĩnh viễn toàn bộ nghiệp vụ upload trong production khi chưa được thống nhất. Cần xác nhận shared-owner trước bước source implementation này. Đây là blocker thực tế, không phải đã sửa an toàn toàn luồng.

### 10.5. D06 — Layout chính xác và đề xuất hẹp cho Uyên

Ownership đã xác nhận từ `../pegaxus-document/screen/flow2-frontend-task-assignment.md`: UC-31 thuộc Uyên. Không có chấp thuận owner được cung cấp trong yêu cầu này; đã gửi câu hỏi xác nhận, không tự giả định được đồng ý. Không sửa AuditTimeline, AuditFilters hoặc DossierAuditHistoryPage.

Source là **CSS Grid**, không phải shared DataTable. `AuditTimeline.tsx:24` dùng chung GRID cho header và rows:

```text
Timestamp | Action | Actor | Target entity | Details (event.note)
15rem     | 15rem  | 13rem | 12rem         | minmax(0, 1fr)
```

Không có cột Status riêng; badge đang ở Action. Header cột cuối thực tế là **Details**, dữ liệu `event.note`, đúng Note mà QA đề cập. Không tự thêm/đổi field hoặc bỏ cột.

Bốn cột trước chiếm **55rem**, cộng bốn gap-x-4 (4rem) và padding pl-12/pr-4 (4rem): khoảng **63rem** trước khi Note có không gian, với root 16px là 1.008px. `xl` phụ thuộc viewport, không phải chiều rộng panel sau sidebar. Note p ở dòng 89 chỉ có `m-0`, chưa wrap chuỗi không có dấu cách; `min-w-0` của cell chưa đủ ngăn text tràn. Đây là bằng chứng source về ràng buộc layout, không phải số đo DOM/screenshot.

Đề xuất narrow patch để Uyên duyệt:

```tsx
const GRID = "xl:grid-cols-[9rem_10rem_9rem_8rem_minmax(0,1fr)]";
```

- Dùng cùng GRID ở header/row; bốn cột metadata giảm từ 55rem xuống 36rem, nhường thêm 19rem cho Details tại cùng panel width. Các con số là **đề xuất**, chưa đo browser/chưa áp dụng.
- Bổ sung min-w-0 ở panel/row và ô Action còn thiếu; badge max-width theo cell, không làm cell nở vì raw action code.
- Giữ Details cell `min-w-0`; p Note dùng `m-0 whitespace-pre-wrap [overflow-wrap:anywhere]`. Hiển thị đầy đủ note, không line-clamp/truncate; text dài tăng chiều cao riêng row, không tràn sang cột khác.
- Duy trì stack hiện có dưới xl; kiểm labels và đọc đầy đủ mọi cell bằng keyboard/mobile. Nếu panel hẹp ở desktop dù viewport lớn, owner cần đo trước khi chọn container breakpoint thay vì thêm scroll toàn trang.
- Không đổi query, filter, pagination, event mapping, history immutability hoặc nút View version history. Không sửa shared DataTable hoặc redesign Audit History. Không áp dụng một bản layout chưa có quyền để đánh dấu D06 đã hoàn thành.

### 10.6. Validation phiên follow-up

Không chạy lại kết quả lịch sử như bằng chứng mới. Các lệnh dưới đây đã thực hiện trong lượt này trên HEAD hiện tại:

| Lệnh                                                                                                     | Kết quả                                                                                    |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm dlx shadcn@latest add @ss-components/date-picker-09 --dry-run`                                     | FAIL exit 1, Unknown registry @ss-components; không có project files/dependencies thay đổi |
| `& ./node_modules/.bin/tsc.cmd --project tsconfig.app.json --noEmit --incremental false --pretty false`  | PASS exit 0                                                                                |
| `& ./node_modules/.bin/tsc.cmd --project tsconfig.node.json --noEmit --incremental false --pretty false` | PASS exit 0                                                                                |
| Scoped Oxlint trên 5 files liên quan bên dưới                                                            | PASS exit 0, 0 diagnostics                                                                 |
| `& ./node_modules/.bin/prettier.cmd --check PEGAXUS_DUONG_UI_FIX_REPORT.md`                              | PASS exit 0 sau append; không format source teammate                                       |
| `git -c core.safecrlf=false diff --check`                                                                | PASS exit 0 trên diff follow-up                                                            |

Scope lint chính xác:

```powershell
& ./node_modules/.bin/oxlint.cmd src/features/transport-plan/components/TransportPlanMetadataForm.tsx src/features/dossier/components/DocumentSubmissionDialog.tsx src/features/dossier/components/AuditTimeline.tsx src/features/dossier/components/AuditFilters.tsx src/features/dossier/pages/DossierAuditHistoryPage.tsx
```

Không format source teammate chỉ vì đang đọc/lint. Không automated tests, browser, API mutations, production build hoặc chạy upload thật. Không mở GPS/session/fixtures khác. Không thay env/config/auth/router/Backend. Full diff của lượt này chỉ là phần follow-up báo cáo; kiểm status/staging lại trước kết thúc.

Git status cuối: ` M PEGAXUS_DUONG_UI_FIX_REPORT.md`; `git diff --cached --name-only` trống. Không có application code mới; không cài thêm dependency vào project. Nội dung lịch sử ở mục 1–9 giữ nguyên trong diff, chỉ append mục 10.

### 10.7. Remaining manual QA và điều kiện tiếp tục

1. Cung cấp registry mapping xác nhận cho D01; dry-run thành công rồi mới cài, kiểm generated source/dependencies/overwrites và mới nối form. Sau đó QA Create/Edit, 00:00/ngày kế, local ISO mapping, keyboard/focus/mobile. Không có QA UI DatePicker mới ở lượt này.
2. Xác nhận Khuyên chấp thuận API snapshot/lock. Sau implementation, QA A success + B uploading phải disabled; B fail tiếp tục disabled; Retry B không upload lại A; Remove B cho reevaluate bằng remaining selection; rapid submit/Enter không bypass snapshot hoặc validation; session cũ/remove callbacks không quay lại.
3. Thử metadata invalid/đã sửa/server field errors, mutation lỗi rồi retry; tất cả uploaded + metadata valid mới được submit. Kiểm payload đủ files theo order, không auto DocumentVersion và không partial collection.
4. Xác nhận Uyên chấp thuận narrow table patch. Đo panel thật sau sidebar ở desktop/mobile, action badge dài, actor/target dài, Note nhiều đoạn/chuỗi không dấu cách. Full note phải đọc được, không page-wide overflow; giữ filter/pagination/history action.

**NEXT SESSION / HANDOFF:** Không bắt đầu lại D03–D05. Baseline mới là HEAD `4c44161bc7ae279315a917ea3e6699a44af39cf2`, không phải `63dba12` trong báo cáo lịch sử. Chỉ báo cáo đổi trong lượt follow-up này. D01 thiếu registry mapping, D02 cần Khuyên duyệt shared state API, D06 cần Uyên duyệt layout UC-31. D02 hiện vẫn có khả năng submit subset, không báo completed hoặc để QA hiểu nhầm đây là all-files gate đã có. Cần đủ ba đầu vào trên trước khi triển khai; không tự cài component khác hoặc sửa code đồng đội. Không Git mutations.

## 11. Follow-up được phép — D02 Safe Upload và D06 Audit Note

Ngày: **19/10/2026**. **Mục này là trạng thái mới nhất**, thay kết luận blocker D02/D06 ở mục 10; không xóa audit lịch sử.

### 11.1. Quyền sửa, Git và giới hạn conflict

Người dùng đã xác nhận tiếp tục: chỉ mở rộng API trạng thái optional/backward-compatible của shared uploader/hook cho Dossier, và chỉ sửa layout của AuditTimeline. Không coi đó là quyền refactor các tính năng khác của Khuyên/Uyên.

| Snapshot               | Kết quả                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Branch / HEAD          | `feat/119-fix-ui/ux-issues` / `4c44161bc7ae279315a917ea3e6699a44af39cf2`, không đổi                                                  |
| Trước lượt sửa         | Chỉ ` M PEGAXUS_DUONG_UI_FIX_REPORT.md` từ follow-up trước; giữ nguyên phần đó                                                       |
| Sau lượt sửa           | 6 tracked files modified: báo cáo và 5 source files bên dưới; không có untracked/deleted/staged files                                |
| Phạm vi tránh conflict | Không đổi tên/move file, không format toàn bộ shared/Audit, không sửa consumers Authority, AuditFilters hoặc DossierAuditHistoryPage |

Không thể bảo đảm không có conflict với các commit tương lai của teammate chưa hiện diện trong checkout. Đã giảm phạm vi diff bằng cách chỉ sửa các điểm nối cần thiết, giữ style cục bộ và API mặc định; không fetch/pull/merge để kiểm tra remote.

### 11.2. Trạng thái acceptance

| Issue | Kết quả mới                                                                           | Giới hạn                                                                   |
| ----- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| D01   | Vẫn blocked bởi registry mapping, như mục 10.3                                        | Không chạy lại install, không sửa DatePicker/Transport Plan trong lượt này |
| D02   | **SOURCE FIXED** — snapshot toàn bộ remaining selection, metadata gate và atomic lock | **RUNTIME NOT VERIFIED**, chưa có upload/retry/API/browser QA thật         |
| D06   | **SOURCE FIXED** — compact columns, container breakpoint và full Note wrapping        | **NOT VISUALLY VERIFIED**, chưa đo desktop/mobile/panel thật               |

Không dùng TypeScript/lint để tuyên bố UI E2E PASS. D03–D05 giữ nguyên, không làm lại.

### 11.3. D02 — API optional và kiểm tra toàn bộ file

Nguyên nhân cũ giữ nguyên bằng chứng: onChange chỉ có success IDs nên không biết pending/failed/removed set. Bản sửa không đếm success IDs để đoán selection.

| API / source                             | Hành vi mới                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FileUploaderSnapshot`                   | revision và bản sao readonly của remaining items theo selection order; có trạng thái, File và publicId                                                                               |
| `onStateChange?: (snapshot) => void`     | Callback optional cho initial state, add/queued, uploading, success/error, retry và remove. Progress-only updates vẫn cập nhật snapshot nội bộ nhưng không phát thêm status callback |
| Optional `ref?: Ref<FileUploaderHandle>` | Dùng React 19 hiện có, không đổi yêu cầu props của consumers cũ                                                                                                                      |
| `getSnapshot()`                          | Đọc selection hiện hành đồng bộ, không chờ React state/effect; copy item/progress để caller không sửa trực tiếp state nội bộ                                                         |
| `lockCompletedSelection(revision)`       | Chỉ thành công nếu revision vẫn đúng, remaining set không rỗng, mọi item success và có publicId. Khóa add/remove/retry đến khi uploader unmount                                      |

`useFileUploader` dùng một publish path cập nhật itemsRef/revision trước setState và status callback. Queue vẫn dùng presignedUpload, accept/maxSize/maxFiles/concurrency hiện có. Không tạo upload service hoặc machinery thứ hai.

Các guard bổ sung là một phần bảo vệ snapshot: sau Remove/unmount/replacement, callback cũ không được đưa file trở lại; progress/success/error chỉ được áp dụng nếu AbortController vẫn đúng attempt và item còn tồn tại. Finally của attempt cũ không xóa controller của attempt mới. Retry chỉ đưa file lỗi về queued; file success khác không bị upload lại. Removed được biểu diễn bằng loại khỏi remaining items, không thêm enum giả.

**Tương thích consumers:** đã kiểm `RecordAuthoritySubmissionDialog.tsx` và `UpdateAuthorityReviewDialog.tsx`. Hai consumers không truyền onStateChange/ref; onUploaded và onChange signatures/success-ID behavior vẫn giữ. Cơ chế lock chỉ kích hoạt khi caller chủ động gọi API mới. Không sửa source hai dialogs, defaults hoặc API Authority. TypeScript bao gồm chúng đã qua; runtime của consumers khác vẫn chưa được kiểm tra.

### 11.4. D02 — Form, freeze và race protection

`DocumentSubmissionDialog` bỏ phụ thuộc vào success-only callbacks/map, thay bằng snapshot được gắn scope theo dossier/requirement/mode/dialog session. Callback không đúng scope hoặc đến sau khi khóa bị bỏ qua; Close/Choose files again tăng session và tạo uploader mới. Layout-effect cleanup chặn callback của dialog cũ trước khi phiên mới hoạt động.

`getCompletedUploadFiles` chỉ tạo bộ asset khi **toàn bộ** remaining items success + có server publicId, rồi áp dụng nguyên createDossierUploadedAsset/validateUploadedAssets. Một file chưa hoàn tất hoặc reference/type/size/uniqueness sai làm cả bộ chưa ready; không lọc lấy successful subset.

Form dùng mode onChange với cùng Zod resolver/rules để eligibility cập nhật theo metadata hiện hành. `canSubmit` đòi đủ:

- Có ít nhất một remaining file và toàn bộ upload results hợp lệ.
- Không queued/uploading/retrying/failed; Retry dùng queued/uploading sẵn có.
- Form valid, không validating/submitting; role/status/eligibility/noRetry guards vẫn giữ.
- Không mutation pending. Request-attempt ref vẫn chặn double submit trong handler.

Tại submit, handleSubmit vẫn validate metadata. Handler đọc lại **getSnapshot hiện hành**, validate toàn bộ set, rồi lock đúng revision đồng bộ, không await giữa đọc/kiểm/khóa. Vì vậy Enter hoặc một handler đang chờ resolver không thể dùng React snapshot cũ để bỏ qua file mới đang upload.

Sau lock, freeze bộ asset đầy đủ vào attempt và truyền chính bộ đó cho mutation hiện có. Uploader unmount khi đã không còn upload pending, không còn hành vi submit subset rồi hủy file chưa xong. Nếu mutation lỗi, giữ frozen successful set để retry mà không upload lại; Choose files again mở session/selection mới. Metadata-only save vẫn là thao tác riêng, không tạo DocumentVersion từ upload.

Không Confirm button, không auto-submit DocumentVersion/dossier và không thay backend authorization/legal review. UX hiển thị số uploaded/tổng remaining, failed → Retry/Remove, waiting, invalid result hoặc Ready; Ready chỉ hiện khi canSubmit đúng. Uploading/failed status và retry controls từng file vẫn do shared component hiển thị. Vùng thông báo giữ min-height, không thêm modal/CSS global.

### 11.5. D06 — Layout cuối đã áp dụng

Chỉ sửa `src/features/dossier/components/AuditTimeline.tsx`. Header vẫn là Details và dữ liệu vẫn event.note; không thêm cột/status/field mới.

```text
Panel rộng ít nhất 52rem:
Timestamp | Action | Actor | Target entity | Details / Note
9rem      | 10rem  | 9rem  | 8rem          | minmax(0, 1fr)

Panel hẹp hơn: stack một cột, vẫn hiển thị toàn bộ dữ liệu.
```

Root thêm @container và min-w-0; cùng GRID cho header/row dùng container query @min-[52rem] thay vì viewport xl. Như vậy panel bị sidebar thu hẹp không bị ép sang bảng chỉ vì viewport lớn. Bốn cột trước giảm từ 55rem xuống 36rem; với padding/gaps cũ, tại ngưỡng 52rem còn khoảng 8rem cho Note trước khi panel rộng thêm.

Note dùng whitespace-pre-wrap + overflow-wrap:anywhere: giữ xuống dòng và wrap chuỗi không dấu cách, không truncate/clamp/discard. Action badge compact radius 2px, co theo cell và wrap raw code thay vì làm nở grid. Actor/target/date cũng min-width/wrap để cột hẹp không cắt mất nội dung. Nút View version history giữ nguyên điều kiện/callback, chỉ giới hạn width và wrap text.

Không sửa AuditFilters, DossierAuditHistoryPage, query/pagination, event order, timestamps, status colors hoặc lịch sử immutable. Không thêm horizontal scroll desktop hoặc thay shared DataTable. Đây là quyết định source layout, chưa phải kết quả đo DOM/thiết bị.

### 11.6. File map phiên được phép

| File                                                           | Lý do                                                                               |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/shared/components/file-uploader/types.ts`                 | Optional callback/ref, snapshot và handle types; giữ UploadStatus/props cũ          |
| `src/shared/components/file-uploader/useFileUploader.ts`       | Synchronous selection state, status notifications, lock và late-callback protection |
| `src/shared/components/FileUploader.tsx`                       | Forward onStateChange, expose optional handle; giữ UI upload và consumers mặc định  |
| `src/features/dossier/components/DocumentSubmissionDialog.tsx` | Full-set/metadata eligibility, scope, submit recheck/freeze và progress feedback    |
| `src/features/dossier/components/AuditTimeline.tsx`            | Chỉ column allocation, wrapping và responsive container breakpoint                  |
| `PEGAXUS_DUONG_UI_FIX_REPORT.md`                               | Append mục 11, bảo toàn mục 1–10 đã có                                              |

### 11.7. Validation và giới hạn formatting

| Lệnh / kiểm tra                                                                                          | Kết quả mới                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `& ./node_modules/.bin/tsc.cmd --project tsconfig.app.json --noEmit --incremental false --pretty false`  | PASS exit 0 sau source changes                                                                                                                                                                      |
| `& ./node_modules/.bin/tsc.cmd --project tsconfig.node.json --noEmit --incremental false --pretty false` | PASS exit 0                                                                                                                                                                                         |
| Scoped Oxlint trên 5 source files                                                                        | PASS exit 0, 0 diagnostics ở lần chạy cuối                                                                                                                                                          |
| Prettier --write/check cho DocumentSubmissionDialog                                                      | PASS; chỉ format form được sửa, không rewrite shared/Audit                                                                                                                                          |
| Prettier --check cho shared FileUploader/types/hook và AuditTimeline                                     | **FAIL exit 1**, 4 files không theo mặc định Prettier; bản HEAD của cả 4 cũng FAIL khi kiểm qua stdin. Giữ style cục bộ để tránh diff format/conflict lớn; không tuyên bố toàn bộ format scope PASS |
| Prettier --check cho báo cáo                                                                             | PASS exit 0 sau append mục 11                                                                                                                                                                       |
| `git -c core.safecrlf=false diff --check`                                                                | PASS exit 0 sau source changes và khi hoàn thiện báo cáo                                                                                                                                            |
| Automated tests / browser / API mutations                                                                | Không chạy; không tạo test files                                                                                                                                                                    |

Lệnh scope chính xác để tiếp tục rà:

```powershell
& ./node_modules/.bin/oxlint.cmd src/shared/components/FileUploader.tsx src/shared/components/file-uploader/types.ts src/shared/components/file-uploader/useFileUploader.ts src/features/dossier/components/DocumentSubmissionDialog.tsx src/features/dossier/components/AuditTimeline.tsx
& ./node_modules/.bin/prettier.cmd --check src/features/dossier/components/DocumentSubmissionDialog.tsx PEGAXUS_DUONG_UI_FIX_REPORT.md
git -c core.safecrlf=false diff --check
git status --short
```

Bằng chứng baseline formatting được kiểm riêng cho từng legacy file, ví dụ:

```powershell
git show HEAD:src/shared/components/file-uploader/types.ts | & ./node_modules/.bin/prettier.cmd --check --stdin-filepath src/shared/components/file-uploader/types.ts
```

Đã rà full source diff: không có schema/DTO/endpoint change, không business state transition, không router/auth/Backend/env/package changes. Không cài package, chạy build, stage/commit/push hoặc Git mutations. Working tree cuối gồm đúng 6 modified files liệt kê; staging trống. Thay đổi báo cáo mục 10 có từ trước lượt này, không bị ghi đè.

### 11.8. Manual QA bắt buộc và handoff mới nhất

Chưa thực hiện các bước runtime sau:

1. Chọn A/B/C; để A success nhưng B/C queued/uploading: Submit disabled. Enter không tạo mutation. Đối chiếu count theo remaining files, không theo số đã thành công.
2. B lỗi: failed row còn Retry/Remove, Submit disabled. Retry B chỉ upload B; A giữ publicId. Remove B reevaluate remaining set; callback/progress cũ không đưa B trở lại.
3. Thêm file mới sau khi mọi file cũ đã success; Submit phải khóa lại ngay. Kiểm thêm/remove nhanh và chọn file vượt giới hạn; không vượt maxFiles hoặc submit partial set.
4. Tất cả files success nhưng metadata invalid → disabled; sửa đúng → Ready. Kiểm server expiry error, double click/Enter, mutation lỗi rồi retry; không upload lại success files và payload đủ đúng order/primary file.
5. Đóng/mở dialog, đổi requirement, Choose files again lúc có late callback: không lẫn file/session. Kiểm consumers Authority mặc định (single/multiple) không cần props mới.
6. Audit panel desktop có sidebar và mobile 320/360/390px: Note nhiều đoạn/chuỗi không dấu cách, action/actor/target dài phải đọc đầy đủ. Kiểm chuyển stack/grid theo panel, không spill/clipping, không mất history action/filter/pagination.

**NEXT SESSION:** D02/D06 đã có source fix và TypeScript/lint evidence, không còn owner blocker như mục 10. D01 vẫn thiếu registry mapping. Giữ 6 modified files và lịch sử báo cáo, không format hàng loạt/shared/teammate files để né 4 baseline Prettier failures. Phối hợp Khuyên review optional API và Uyên review class-only AuditTimeline trước merge; chưa khẳng định không conflict với remote hoặc có runtime/visual PASS. Không tự chạy real upload mutations/tests nếu chưa được phép.

## 12. Huy TimePicker shared và kiểm tra progress upload

Ngày: **19/10/2026**. Trạng thái mới nhất của D01/D02 nằm ở mục này; không xóa nội dung audit lịch sử. Chỉ sửa D01, kiểm tra source D02; không làm lại D03–D06.

### 12.1. Git và shared location

| Nội dung                  | Bằng chứng                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Branch                    | `feat/119-fix-ui/ux-issues`, không đổi                                                                                           |
| HEAD                      | `55edea508e7dd8dc2427bf2f00db27f15f34036c` — `fix: :lipstick: Prevent partial uploads and refine audit layout (#119)`            |
| Working tree trước sửa    | Sạch; các thay đổi D02/D06 và báo cáo trước đã có trong HEAD                                                                     |
| Working tree cuối         | 2 tracked files modified: báo cáo và TransportPlanMetadataForm; 1 untracked file mới: shared time-picker.tsx; không staged files |
| Shared component bắt buộc | **`src/shared/components/ui/time-picker.tsx`**, named exports `TimePicker`, `TimePickerProps`                                    |

Đã đọc components.json: alias ui là `@/shared/components/ui`. Input/Label đã tồn tại với named exports; lucide-react đã được cài và có Clock8Icon. Không cài dependency, không chạy lại registry command hoặc đoán URL. Source demo được người dùng cung cấp thủ công nên blocker registry cũ **không còn chặn D01**.

Không tạo TimePicker trong transport-plan, src/components hoặc components/shadcn-studio. Không overwrite/sửa `src/shared/components/ui/date-picker.tsx`, Input, Label hoặc shared CSS. Component mới không import Transport Plan types, auth, service hoặc business validation.

### 12.2. D01 — SOURCE FIXED, controlled component

TimePicker được chuyển từ demo date-picker-09.tsx sang API controlled:

- Bắt buộc `value: string` và `onChange(value: string)`; không defaultValue/demo time hoặc hardcoded id.
- Hỗ trợ id, disabled, className, ref/onBlur/name/ARIA và các HTML input props còn lại. className áp dụng vào Input, không vào wrapper.
- Reuse Input/Label từ shared UI; optional label và labelClassName phục vụ form thường hoặc nhãn screen reader. Label htmlFor dùng đúng input id; nếu không truyền id thì useId tạo id ổn định.
- Clock8Icon trang trí, aria-hidden và pointer-events-none. Radius 2px, height h-9, padding cho icon, token background/muted/focus/error dùng lại Input/project; không palette hoặc CSS global mới.
- Native `type="time"`, mặc định step 60 giây. Consumer khác có thể truyền step khác khi cần seconds. Không có Radix time dropdown mới.

**Giới hạn native UI:** ẩn WebKit picker indicator theo mẫu không bảo đảm mọi browser/OS không mở popup hoặc hiển thị 24 giờ. Giá trị controlled dùng HH:mm; cách hiển thị AM/PM, keyboard segments và popup do browser/locale quyết định. Không khẳng định native time popup đã được style hoàn toàn bằng Tailwind.

### 12.3. Create/Edit, React Hook Form và timezone

`src/features/transport-plan/components/TransportPlanMetadataForm.tsx` import trực tiếp shared TimePicker cho cả plannedStartAt/plannedEndAt, thay hai Radix Select giờ/phút. Xóa timeOptions và imports Select không còn dùng; Calendar date selection giữ nguyên.

`BookingTransportPlanAction.tsx` và `pages/EditTransportPlanPage.tsx` đều dùng form này nên Create/Edit dùng cùng picker. Không sửa hai caller hoặc route của chúng.

RHF field vẫn giữ chuỗi local datetime đầy đủ. DatePicker tiếp tục nhận date part; TimePicker nhận `time.slice(0, 5)` để chỉnh HH:mm. Khi đổi giờ/phút, ghép lại với ngày hiện tại và giữ phần seconds/milliseconds đã tải nếu có, giống chính sách cũ; khi đổi ngày giữ nguyên time. Không tạo giờ UTC hoặc ngày hiện tại ngầm trong picker.

Clear time giữ date part với thời gian chưa hoàn chỉnh để schema hiện có yêu cầu sửa trước khi submit, không âm thầm dùng giờ cũ. onBlur/touched, FormControl id riêng cho time, aria-describedby/aria-invalid, disabled/loading/permission guards và vùng FormMessage giữ nguyên. Ref/ARIA props đi qua component tới Input thực tế; nhãn TimePicker ẩn với screen-reader label đúng field.

Không sửa schemas, plannedStart-before-end rule, concurrency hoặc DTO/endpoints. `planToForm` vẫn dùng toLocalDateTime; buildCreatePlanInput/buildUpdatePlanInput vẫn chuyển sang ISO bằng new Date(localValue).toISOString() tại submit. Đây là kết luận source, **chưa phải runtime xác minh timezone/DST/midnight**.

### 12.4. D02 — progress hiện tại được giữ, không rewrite

Đã đọc lại FileUploader, useFileUploader, types và DocumentSubmissionDialog tại HEAD mới, không dựa riêng vào report cũ. Không phát hiện source regression khiến status callback optional làm mất progress UI; không sửa các file D02.

| Điểm kiểm tra              | Kết quả source                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FileUploader.tsx`         | Mỗi item uploading vẫn render stage/percent và `<Progress value={item.progress.percent}>`; không chỉ render tại completion                                           |
| `useFileUploader.ts`       | onProgress gọi patchItem → publishItems → **setItems(next)** cho mỗi progress update. notify=false chỉ bỏ callback aggregate, không bỏ local render của FileUploader |
| Success/error/retry/remove | Presentation và actions từng file giữ nguyên. Auto-hide timer chỉ áp dụng success items, không ẩn item đang uploading                                                |
| All-files gate             | getCompletedUploadFiles vẫn yêu cầu toàn bộ remaining items success + publicId hợp lệ; pending/failed làm files chưa ready                                           |
| Submit                     | canSubmit vẫn đòi form valid, không validating/submitting/pending và đủ quyền. Handler đọc snapshot đồng bộ + lock đúng revision, không submit subset                |
| Add/Remove/Retry           | Các transitions publish remaining snapshot để form reevaluate. Retry không upload lại successful items; freeze/session guards không đổi                              |

**Phân biệt progress thực tế:** nguồn `src/shared/utils/presigned/uploader.ts` hiện phát mốc signing=0, uploading=25, confirming=75, completed=100 theo các giai đoạn request. Transport dùng fetch, **không có byte-level upload progress**; trong một transfer dài phần trăm có thể giữ 25 đến khi chuyển sang confirming. Vì vậy không gọi đây là số đo % byte hoặc khẳng định phần trăm tăng liên tục trong lúc truyền.

Không thêm timer/simulated percentage, không thay progress hiện có bằng count tổng và không viết lại shared upload transport. Nếu QA yêu cầu % byte liên tục, cần Khuyên duyệt thay đổi presigned uploader/transport riêng; việc giữ UI progress và all-files gate ở đây không chứng minh yêu cầu đo byte đã được triển khai.

Không Confirm button hoặc auto-submit DocumentVersion/dossier được thêm lại. Authority consumers không bị sửa. Không thực hiện upload/API mutations để kiểm chứng runtime.

### 12.5. Browser attempt và validation

Đã đọc hướng dẫn browser và thử kết nối một lần để kiểm tra native time input. Công cụ thất bại trước khi mở trang với lỗi môi trường `codex/sandbox-state-meta: missing field sandboxPolicy`. Không có DOM/screenshot hoặc tương tác input nào được ghi nhận. Không fallback sang standalone automated tests hoặc gọi API thật. **NOT VISUALLY VERIFIED — RUNTIME NOT VERIFIED**.

| Lệnh / kiểm tra trong lượt này                                                                           | Kết quả                                                       |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `& ./node_modules/.bin/tsc.cmd --project tsconfig.app.json --noEmit --incremental false --pretty false`  | PASS exit 0 sau source changes                                |
| `& ./node_modules/.bin/tsc.cmd --project tsconfig.node.json --noEmit --incremental false --pretty false` | PASS exit 0                                                   |
| Scoped Oxlint theo lệnh bên dưới                                                                         | PASS exit 0, 0 diagnostics                                    |
| Prettier write/check cho TimePicker và TransportPlanMetadataForm                                         | PASS; không format source upload/Audit hoặc shared DatePicker |
| Prettier check báo cáo và git diff --check                                                               | PASS exit 0 sau khi hoàn thiện mục 12                         |
| Automated tests / build / API mutations                                                                  | Không chạy                                                    |

```powershell
& ./node_modules/.bin/oxlint.cmd src/shared/components/ui/time-picker.tsx src/features/transport-plan/components/TransportPlanMetadataForm.tsx src/shared/components/FileUploader.tsx src/shared/components/file-uploader/useFileUploader.ts src/shared/components/file-uploader/types.ts src/features/dossier/components/DocumentSubmissionDialog.tsx
& ./node_modules/.bin/prettier.cmd --check src/shared/components/ui/time-picker.tsx src/features/transport-plan/components/TransportPlanMetadataForm.tsx PEGAXUS_DUONG_UI_FIX_REPORT.md
git -c core.safecrlf=false diff --check
git status --short
```

### 12.6. Files, diff review và manual QA

| File mới/sửa trong lượt này                                            | Thay đổi                                                                                                   |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/shared/components/ui/time-picker.tsx`                             | **Mới**, shared controlled TimePicker theo mẫu Huy, chỉ Input/Label/icon và input props                    |
| `src/features/transport-plan/components/TransportPlanMetadataForm.tsx` | Import shared TimePicker cho Create/Edit, bỏ Radix hour/minute Select, giữ local datetime/RHF/range guards |
| `PEGAXUS_DUONG_UI_FIX_REPORT.md`                                       | Append mục 12, giữ nguyên lịch sử mục 1–11                                                                 |

Đã đọc cả diff tracked và toàn bộ shared file mới (git diff thông thường chưa chứa untracked file). Không sửa D02/D03–D06, shared DatePicker, utilities datetime, schemas, router/sidebar, Backend, Booking/RoutePlan, package/lockfile hoặc env. Không stage/commit/push/switch/fetch/merge/reset/stash.

Manual QA còn lại, chưa thực hiện:

1. Create/Edit: Planned Start/End dùng Calendar hiện có + một time input, không Radix hour/minute menu. Kiểm thao tác keyboard, chọn segment giờ/phút, xóa/nhập lại, label/focus/disabled/error; cả desktop và mobile 320/360/390px.
2. Chọn ngày trước/giờ trước, 00:00/23:59, chuyển ngày/tháng; mở lại Edit và so sánh local display với response/payload ISO đúng timezone. Kiểm dữ liệu có seconds/ms không bị mất khi chỉ đổi ngày/phút, start/end ordering và server/concurrency errors không đổi.
3. Kiểm native input trên browser/OS đích: popup/AM-PM/step behavior và focus ring không clip. Không dùng screenshot của source demo làm nghiệm thu component thực tế.
4. D02: development fixtures được phép, file lớn/multiple để quan sát stage/progress; failed Retry/Remove, thêm file mới khóa Submit, metadata invalid vẫn disabled. Đối chiếu all-files snapshot + manual DocumentVersion submit; không diễn giải mốc stage thành % byte.

**NEXT SESSION:** Shared path chính thức là `src/shared/components/ui/time-picker.tsx`; không tạo bản feature-local hoặc generate registry để làm lại. D01 đã SOURCE FIXED bằng manual source, không còn registry blocker cho cách triển khai này; cần browser QA. D02 giữ source đã có, progress stage-based và all-files gate đã trace, không có upload runtime PASS. Giữ 3 files thay đổi của lượt này (2 modified + 1 untracked), không chạm D03–D06 hoặc mở rộng upload transport khi chưa owner xác nhận.
