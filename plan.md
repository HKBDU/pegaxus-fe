# Plan — MapViewer và Map Utils

## 1. Phạm vi

Implement đúng phần Map trong file TXT:

- Map Geoapify + React Map Libre.
- Pan, zoom và hiển thị marker Location.
- Location Details Popup khi hover/click marker.
- Search Location bằng dropdown có sẵn, đọc dữ liệu từ DB.
- Chọn Location rồi tự fly tới marker.
- Coordinator chọn điểm trên map hoặc search để tạo Location.
- Coordinator Add/Edit/Delete Location.
- Coordinator chọn Location đầu/cuối để tạo Route.
- Route preview bằng GeoJSON nếu backend trả geometry.
- Role-based action visibility và thông báo chờ seed data cho phần `XXX`.

Không lập plan cho toàn bộ Flow 3. Không mở rộng sang Transport Plan, quotation, RoutePlan workflow, legal review, emergency change, notification inbox hoặc các màn hình quản trị riêng.

## 2. File scope

Path chính xác phải theo mục “Việc của Khuyên” trong TXT. Không tự tạo feature/page/router folder ngoài ownership đó.

Nếu ownership của TXT dùng cấu trúc hiện tại, chỉ cần nhóm file tương đương:

```text
src/shared/components/map/
├── MapViewer.tsx                 # composition/orchestration only
├── MapViewport.tsx               # react-map-gl/maplibre wrapper
├── MapControls.tsx               # zoom, reset, fit bounds
├── LocationMarkers.tsx            # marker list and selected/hover state
├── LocationMarker.tsx             # single accessible marker
├── LocationPopup.tsx              # location details and role actions
├── LocationSearch.tsx             # searchable DB Location selector
├── MapSelectionMode.tsx            # click-to-select From/To or Add Location
├── RouteLayer.tsx                 # optional GeoJSON line source/layer
├── useMapViewerState.ts            # selected/hovered/mode state only
├── AddLocationForm.tsx            # Coordinator form UI only
├── EditLocationForm.tsx           # Coordinator form UI only
└── RouteForm.tsx                  # From/To and route fields UI only

src/shared/utils/map/
├── coordinates.ts
├── bounds.ts
├── geojson.ts
├── geoapify.ts
└── index.ts
```

Có thể tách marker/popup thành component con trong cùng thư mục Map nếu cần. Không sửa `router`, layout, sidebar hoặc feature folder của người khác.

Dependency `maplibre-gl` và `react-map-gl` đã có trong working tree; không thêm lại hoặc revert.

## 3. API liên quan trong `flow3.md`

### Đọc Location

```text
GET /api/v1/locations
```

Query:

- `pageIndex`, `pageSize`.
- `search`: `locationName`, `city`.
- `country`.
- `locationType`.

Location fields dùng cho map/popup/form:

```text
locationId
locationName
locationType
address
city
stateProvince
country
latitude
longitude
locationNote
```

### Đọc Route master

```text
GET /api/v1/routes
```

Query:

- `fromLocationId`.
- `toLocationId`.
- `transportMode`: `ROAD`, `SEA`, `AIR`.
- `search`: `routeCode`, `routeName`.
- Pagination theo contract.

Route fields liên quan map:

```text
routeId
routeCode
routeName
transportMode
distanceKm
estimatedDurationMinutes
fromLocation
toLocation
```

### API còn thiếu trong contract

TXT yêu cầu Coordinator:

- Add/Edit/Delete Location.
- Create/Edit/Delete Route.

`flow3.md` chỉ mô tả GET Location/Route, chưa có mutation endpoint master. Vì vậy plan chỉ chuẩn bị form, payload, selection state và callback; không tự đoán URL/method/request body.

Khi BE bổ sung contract, service mutation cần:

- Gửi đúng field schema.
- Invalidate lại Location/Route list.
- Focus marker mới hoặc clear marker đã soft-delete sau khi thành công.
- Hiển thị `errorCode` và `errors[]` khi thất bại.

Nếu Route chưa tồn tại, việc BE dùng tọa độ hai Location gọi Geoapify Routing, lấy GeoJSON và lưu Route là backend responsibility. Frontend không tự lưu dữ liệu master và không tự gửi distance/duration do frontend tính.

## 4. MapViewer architecture

MapViewer là component generic và chỉ làm composition/orchestration. MapViewer không chứa toàn bộ JSX, form schema, API call hoặc business mutation.

### Trách nhiệm của `MapViewer.tsx`

- Nhận props từ container.
- Ghép `MapViewport`, `MapControls`, `LocationMarkers`, `LocationPopup`, `LocationSearch`, `MapSelectionMode` và `RouteLayer`.
- Giữ state điều phối tối thiểu: selected location, hovered location, active selection mode.
- Chuyển callback giữa các phần con.
- Không gọi `/locations`, `/routes`, Geoapify mutation hoặc Location/Route mutation.
- Không chứa form Add/Edit Location hoặc Route.

### Các component con

#### `MapViewport.tsx`

- Khởi tạo React Map Libre.
- Nhận view state, style URL, map event callbacks.
- Xử lý pan/zoom native của map.
- Expose ref/callback tối thiểu cho `flyTo`, `easeTo`, `fitBounds`.
- Không biết role, API response hoặc form state.

#### `MapControls.tsx`

- Nút zoom in/out.
- Nút reset view.
- Nút fit bounds khi có dữ liệu.
- Nút bật/tắt selection mode nếu UI cần.
- Chỉ phát callback, không tự thay đổi domain state.

#### `LocationMarkers.tsx` và `LocationMarker.tsx`

- `LocationMarkers` map qua danh sách Location hợp lệ.
- `LocationMarker` render một marker accessible.
- Tách selected, hover, focus và click behavior khỏi MapViewer.
- Không render form hoặc gọi API.

#### `LocationPopup.tsx`

- Render country code, name/type, address, coordinates và note.
- Nhận `canEdit`/`canDelete` từ container.
- Render action Edit/Delete chỉ khi được phép.
- Phát `onEdit`/`onDelete`; không gọi mutation trực tiếp.

#### `LocationSearch.tsx`

- Render ô search/dropdown.
- Nhận options, loading, empty state và selected value.
- Phát Location được chọn để container gọi fly-to.
- Không nhúng endpoint `/locations` vào UI primitive.

#### `MapSelectionMode.tsx`

- Quản lý presentation của chế độ click-to-select.
- Phát `{ latitude, longitude }` khi map được click.
- Hỗ trợ context selection: `ADD_LOCATION`, `FROM_LOCATION`, `TO_LOCATION`.
- Không tự quyết định form nào mở.

#### `RouteLayer.tsx`

- Nhận GeoJSON đã validate.
- Render line source/layer và selected route style.
- Không tính distance/duration.
- Không gọi Geoapify Routing.

#### Form components

- `AddLocationForm.tsx`: chỉ render/validate fields của Add Location.
- `EditLocationForm.tsx`: dùng cùng field model, nhận initial data.
- `RouteForm.tsx`: From, To, name, mode, note.
- Form submit phát payload/callback ra container; mutation nằm ngoài MapViewer.
- Dùng `react-hook-form`, `zod`, `Form`, `Input`, `Textarea`, `Select` và dialog có sẵn.

Nếu Add/Edit form dùng chung nhiều field, tách thêm `LocationFormFields.tsx`; không copy JSX giữa hai form.

### Luồng dữ liệu

```text
Container/API data
        │
        ▼
MapViewer + useMapViewerState
   ┌────┼──────────┬─────────────┐
   ▼    ▼          ▼             ▼
Viewport Markers  Search      RouteLayer
   │    │          │             │
   └────┴────── callbacks ───────┘
                    │
                    ▼
          Container / form mutation
```

`useMapViewerState.ts` chỉ quản lý selected/hovered Location và selection mode. React Query, API data, form submit và toast không được đưa vào hook này.

### Input tối thiểu

```ts
type MapLocation = {
  id: string | number
  name: string
  type?: string | null
  country?: string | null
  address?: string | null
  city?: string | null
  stateProvince?: string | null
  latitude: number
  longitude: number
  note?: string | null
}
```

Nhận thêm optional route GeoJSON để vẽ line.

### Callback

- `onLocationSelect(location)`.
- `onLocationHover(location | null)`.
- `onMapClick({ latitude, longitude })`.
- `onMarkerAction(action, location)` cho Edit/Delete.
- `onRouteSelect(route)` nếu route layer được bật.

### Behavior

- Kéo map, zoom in/out, reset view.
- Hiển thị marker từ danh sách Location.
- Hover marker hiển thị popup trên desktop.
- Click/focus marker cũng mở popup để hỗ trợ mobile/keyboard.
- Location selected có style khác marker thường.
- Dropdown selection gọi `flyTo`/`easeTo`.
- Có `fitBounds` khi load nhiều Location hoặc route geometry.
- Map click chỉ phát event cho form cha xử lý.
- Có loading, empty, invalid coordinate và map error state.
- Marker/popup có accessible label; không phụ thuộc hover duy nhất.

Popup hiển thị đúng TXT:

```text
Mã quốc gia: Tên địa điểm - Loại địa điểm
Địa chỉ cụ thể
Latitude; Longitude
Location Note
```

## 5. Map utils

### Coordinate

- Parse decimal/string thành finite number.
- Validate latitude `[-90, 90]`.
- Validate longitude `[-180, 180]`.
- Convert API `{ latitude, longitude }` sang MapLibre `[longitude, latitude]`.
- Convert click point ngược thành `{ latitude, longitude }`.
- Bỏ qua Location thiếu, `null`, `NaN`, `Infinity` coordinate.

### Bounds

- Tạo bounds từ Location list.
- Tạo bounds từ LineString/MultiLineString GeoJSON.
- Trả `null` nếu không có coordinate hợp lệ.
- Hỗ trợ padding/minimum zoom.
- Không mutate input.

### GeoJSON

- Validate `Feature`, `FeatureCollection`, `LineString`, `MultiLineString`.
- Chuẩn hóa coordinate order.
- Tạo source data cho route line.
- Không suy diễn distance/duration từ geometry để gửi ngược BE.

### Geoapify

- Tạo Map style URL từ `VITE_GEOAPIFY_API_KEY`.
- Search địa điểm trên map.
- Reverse geocode từ latitude/longitude.
- Parse address, city, state/province, country, country code và coordinates.
- Encode query parameters.
- Abort request cũ khi query mới.
- Map lỗi missing key, network và quota thành lỗi hiển thị được.
- Không hard-code key hoặc gửi secret backend ra browser.
- Không gọi Geoapify Routing từ FE cho flow BE đã nhận trách nhiệm này.

## 6. Search Location

Dùng component dropdown/select có sẵn trong `src/shared/components/ui/` nếu đáp ứng được.

Nếu Select hiện tại chưa search được:

1. Tạo wrapper searchable tối thiểu trong cùng phạm vi Map/ownership.
2. Wrapper chỉ quản lý input, option, loading, empty state và callback.
3. Logic gọi `/locations` nằm ở container/service, không nằm trong UI primitive.
4. Debounce search trước khi gọi API.
5. Khi chọn option, truyền Location vào MapViewer để fly tới marker.

## 7. Coordinator flow

### Add Location

1. Coordinator bấm `Add Location`.
2. Chọn điểm bằng click map hoặc search trên Geoapify.
3. Reverse geocode để gợi ý address/city/state/country.
4. Hiển thị form:
   - Name: bắt buộc.
   - Type: optional, dropdown `CITY`, `BORDER_GATE`, `AIRPORT`, `SEAPORT`, `STABLE`, `REST_STOP`, `OTHER`.
   - Address.
   - City.
   - State/Province.
   - Country.
   - Latitude/Longitude.
   - Note: optional.
5. Validate Name và coordinate.
6. Submit mutation khi BE có endpoint.
7. Thành công: refresh Location list, đóng form, focus Location mới.
8. Thất bại: giữ form và hiển thị field errors/error code.

### Edit/Delete Location

- Chỉ Coordinator thấy action trong popup.
- Edit lấy dữ liệu Location hiện tại làm initial form.
- Delete dùng confirm dialog có sẵn.
- Vì DB soft delete, chỉ remove marker sau khi BE trả success.
- Sau success refresh list và clear selection nếu Location đã xóa.

## 8. Coordinator Route flow

### Chọn đầu/cuối

- Chọn From/To bằng dropdown Location.
- Hoặc bật selection mode rồi click marker.
- Không cho From và To là cùng một Location.
- Hiển thị endpoint/preview line nếu có geometry.

### Form Route

- From Location: bắt buộc.
- To Location: bắt buộc.
- Route name.
- Transport mode: `ROAD`, `SEA`, `AIR`.
- Note: optional.

Create/Edit/Delete Route chỉ được wire sau khi BE cung cấp mutation contract. Frontend không tự xác định Route bằng tên để gọi endpoint khi contract chưa định nghĩa; nếu API yêu cầu identifier, dùng `routeId`.

## 9. Role và phần `XXX`

- Dùng auth/access-control hiện có để kiểm tra role.
- Coordinator thấy `Add/Edit/Delete Location` và `Create/Edit/Delete Route`.
- Role khác chỉ thấy action read được phép.
- Phần gán Vehicle cho ROAD và Provider/Driver/Escort theo mode chưa có seed data: không fake mutation.
- Nếu UI có nút thuộc phần `XXX`, dùng `toast.info("Wait data of ...")` theo yêu cầu TXT.
- Backend vẫn phải enforce authorization.

## 10. Thứ tự code

1. Tạo coordinate, bounds, GeoJSON và Geoapify utilities.
2. Tạo `MapViewport`, `MapControls`, `LocationMarker` và `LocationMarkers`.
3. Tạo `LocationPopup`, `LocationSearch`, `MapSelectionMode` và `RouteLayer`.
4. Tạo `useMapViewerState`, sau đó ghép các phần bằng `MapViewer` mỏng.
5. Nối Location dropdown/search với L1 và fly-to.
6. Thêm reverse geocode, `AddLocationForm`, `EditLocationForm` và `RouteForm`.
7. Chỉ wire mutation khi BE cung cấp endpoint; không mở rộng sang phần Flow 3 khác.

## 11. Verification

```bash
pnpm build
pnpm lint
pnpm check:cycles
```

- Map load đúng Geoapify style.
- Pan, zoom và fit bounds hoạt động.
- Location list rỗng/thiếu coordinate không làm crash.
- Marker hover/click/focus mở popup đúng nội dung.
- Dropdown search có debounce và fly tới Location đúng.
- Click map trả đúng latitude/longitude.
- Reverse geocode điền gợi ý nhưng user vẫn sửa được.
- Coordinator thấy đúng action; role khác không thấy mutation action.
- From/To không được trùng.
- GeoJSON route không làm hỏng marker layer.
- Không gửi API key/secret sai nơi.
- Không tự tạo endpoint hoặc gửi distance/duration chưa có trong contract.

## 12. Nguyên tắc code

- Chỉ code trong ownership Map của Khuyên.
- Tái sử dụng UI, form, dialog, toast và auth utility trong `src/shared/`.
- Không code lại API client hoặc UI primitive đã có.
- MapViewer generic; API/business mutation nằm ở container/service được giao.
- Mỗi component map có một trách nhiệm; MapViewer chỉ orchestration, không trở thành God File.
- Không để form JSX, map imperative API, marker rendering và API mutation chung một file.
- Format component/JSX nhiều dòng, dễ đọc.
- Không tự đoán contract backend còn thiếu.
- FE gọi API của BE; BE gọi API bên thứ ba.
