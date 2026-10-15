# Map components

Module này cung cấp các component dùng chung để hiển thị Location và Route trên bản đồ Geoapify + MapLibre.

Mục tiêu của module là giữ phần bản đồ độc lập với API và business flow. Container bên ngoài chịu trách nhiệm gọi BE, kiểm tra role, mở form và xử lý mutation.

## Tính năng đã có

- Render bản đồ MapLibre với Geoapify style.
- Pan, zoom, reset view và fit bounds.
- Render nhiều Location marker.
- Bỏ qua Location có tọa độ không hợp lệ.
- Hover marker để mở Location popup.
- Popup tự đóng sau 3 giây khi không còn hover.
- Popup vẫn giữ nguyên khi rê chuột từ marker vào popup.
- Popup cố định bên dưới thanh search, không tự làm map nhảy vị trí.
- Search Location có debounce 300ms.
- Click Location trong search để fly tới marker.
- Chọn From/To khi tạo Route bằng searchable picker có debounce 300ms.
- Click map trả về `{ latitude, longitude }`.
- Add Location mode tìm Nearby POI trong bán kính 10km.
- Nearby POI dùng trực tiếp name, address và tọa độ từ Places response.
- Exact clicked point dùng Reverse Geocoding để gợi ý địa chỉ.
- Render Route bằng GeoJSON `LineString` hoặc `MultiLineString`.
- Render nhiều Route qua `routes`, vẫn giữ compatibility với prop `route`.
- Một mode duy nhất: `view`, `addLocation`, `addRoute`, `buildPlan`.
- Route preview Geoapify có abort, timeout và estimated distance/duration.
- Add/Edit Location form có validation.
- Route form có validation From/To không được trùng.
- Hiển thị Edit/Delete theo callback và quyền do container truyền vào.
- Geoapify search và reverse geocoding utilities.
- MapLibre worker dùng URL do Vite sinh ra, không hard-code URL.

## Tính năng đang chờ BE/API contract

`flow3.md` hiện mới mô tả API đọc:

- `GET /api/v1/locations`
- `GET /api/v1/routes`

Vì vậy module chưa tự gọi mutation cho các thao tác sau:

- Add/Edit/Delete Location.
- Create/Edit/Delete Route.
- Lưu geometry Route.
- Gọi Geoapify Routing và lưu distance/duration.

Các form chỉ phát payload qua `onSubmit`. Khi BE bổ sung contract, container/service mới được wire mutation.

## Import nhanh

Import từ barrel file:

```tsx
import {
  MapViewer,
  type MapLocation,
  type MapRoute,
} from "@/shared/components/map";
```

## Ví dụ sử dụng

```tsx
import { useMemo, useState } from "react";
import { MapViewer, type MapLocation } from "@/shared/components/map";

export function LocationMap({ locations }: { locations: MapLocation[] }) {
  const [search, setSearch] = useState("");

  const options = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return locations;

    return locations.filter((location) =>
      [location.name, location.city, location.country]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [locations, search]);

  return (
    <MapViewer
      locations={locations}
      showSearch
      searchOptions={options}
      onSearchChange={setSearch}
      onLocationSelect={(location) => {
        console.log("Selected location", location);
      }}
      onMapClick={(point) => {
        console.log("Map point", point);
      }}
    />
  );
}
```

## `MapLocation`

```ts
type MapLocation = {
  id: string | number;
  name: string;
  type?: string | null;
  country?: string | null;
  address?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  latitude: number;
  longitude: number;
  note?: string | null;
};
```

Mapping từ response BE nên đặt ở container/service:

```ts
const location: MapLocation = {
  id: apiLocation.locationId,
  name: apiLocation.locationName,
  type: apiLocation.locationType,
  address: apiLocation.address,
  city: apiLocation.city,
  stateProvince: apiLocation.stateProvince,
  country: apiLocation.country,
  latitude: Number(apiLocation.latitude),
  longitude: Number(apiLocation.longitude),
  note: apiLocation.locationNote,
};
```

## Các callback chính

| Callback           | Khi nào chạy                              |
| ------------------ | ----------------------------------------- |
| `onLocationSelect` | User chọn marker hoặc option trong search |
| `onLocationHover`  | User hover vào/rời marker                 |
| `onMapClick`       | User click một điểm trên map              |
| `onMarkerAction`   | User bấm Edit/Delete trong popup          |
| `onRouteSelect`    | User click Route line                     |
| `onSearchChange`   | Search input sau debounce                 |

`MapViewer` không gọi API mutation và không kiểm tra role. Container cần truyền:

```tsx
<MapViewer
  canEditLocation={isCoordinator}
  canDeleteLocation={isCoordinator}
  onMarkerAction={(action, location) => {
    if (action === "EDIT") openEditForm(location);
    if (action === "DELETE") openDeleteConfirm(location);
  }}
/>
```

## Route GeoJSON

Truyền geometry backend trả về qua `routeGeoJson`:

```tsx
<MapViewer
  locations={locations}
  route={{ id: route.routeId, name: route.routeName }}
  routeGeoJson={route.geometry}
/>
```

Module chỉ validate và render geometry. Không tính lại distance/duration để gửi về BE.

## Geoapify

`.env` cần có:

```env
VITE_GEOAPIFY_API_KEY=your-key
```

Utilities:

```ts
import {
  createGeoapifyMapStyleUrl,
  reverseGeocodeGeoapify,
  searchGeoapifyPlaces,
} from "@/shared/utils/map";
```

Add Location nearby search dùng đúng các category trong bán kính 10km:

```ts
const nearbyCategories = [
  "populated_place.city",
  "airport",
  "commercial.port",
  "service.vehicle",
];
```

Luồng chọn POI không gọi thêm API. Chỉ luồng `Use exact clicked point` mới gọi Reverse Geocoding.

Không hard-code API key trong source code. Geoapify Routing preview chỉ dùng cho interaction; không thay thế distance/duration chính thức từ BE.

## Whitebox test

Trong môi trường development, mở:

```text
http://localhost:5173/__dev/map
```

Trang test:

- Login qua BE bằng từng role.
- Gọi `GET /locations` bằng access token thật.
- Nếu BE chưa trả về Location, hiển thị trạng thái rỗng/lỗi từ API; không dùng dữ liệu fallback.
- Hiển thị nguồn dữ liệu `BE` hoặc `MOCK`.
- Coordinator thấy các action Add Location và Create Route.
- Role khác chỉ thấy chức năng đọc.

Mutation trong whitebox chỉ hiển thị payload bằng toast, chưa gửi request vì contract chưa có endpoint.

## Cấu trúc file

```text
map/
├── MapViewer.tsx              # Component composition chính
├── MapViewport.tsx            # Wrapper react-map-gl/maplibre
├── MapControls.tsx            # Zoom, reset, fit bounds
├── LocationMarkers.tsx        # Danh sách marker
├── LocationMarker.tsx         # Một marker
├── LocationPopup.tsx          # Popup hover
├── LocationSearch.tsx         # Search UI
├── MapSelectionMode.tsx       # Hiển thị selection mode
├── RouteLayer.tsx              # GeoJSON line, single/multi route
├── RoutePreviewLayer.tsx       # Preview line
├── useMapViewerState.ts        # State selected/hovered/mode
├── AddLocationForm.tsx
├── EditLocationForm.tsx
├── LocationFormFields.tsx
├── RouteForm.tsx
├── maplibre-worker.ts          # Vite worker URL setup
└── types.ts
```

Utility nằm tại `src/shared/utils/map/`:

- `coordinates.ts`: parse và validate tọa độ.
- `bounds.ts`: tạo bounds từ Location/Route.
- `geojson.ts`: validate và normalize GeoJSON.
- `geoapify.ts`: style URL, search và reverse geocode.

## Kiểm tra trước khi commit

```bash
pnpm exec tsc -b
pnpm build
pnpm lint
```

Nếu sửa import hoặc tách component, chạy thêm:

```bash
pnpm check:cycles
```

`check:cycles` hiện có một vòng import cũ trong `features/dossier`; cần phân biệt lỗi đó với thay đổi trong Map module.
