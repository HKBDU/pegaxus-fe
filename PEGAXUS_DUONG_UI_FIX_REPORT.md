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
