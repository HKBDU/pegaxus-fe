# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: route-plan-build.spec.ts >> route-plan-build flow
- Location: e2e\real-api\route-plan-build.spec.ts:142:1

# Error details

```
TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('tbody tr').filter({ has: getByRole('link', { name: 'TR-20261110-6010' }) }).first() to be visible

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - link "PEGAXUS home" [ref=e7] [cursor=pointer]:
        - /url: /
        - img "PEGAXUS" [ref=e8]
      - list [ref=e13]:
        - listitem [ref=e14]:
          - link "Approved Bookings" [ref=e15] [cursor=pointer]:
            - /url: /admin/approved-bookings
        - listitem [ref=e21]:
          - link "Ongoing Transports" [ref=e22] [cursor=pointer]:
            - /url: /admin/ongoing-transports
        - listitem [ref=e29]:
          - link "Incidents" [ref=e30] [cursor=pointer]:
            - /url: /admin/incidents
        - listitem [ref=e34]:
          - link "Vehicles" [ref=e35] [cursor=pointer]:
            - /url: /vehicles
        - listitem [ref=e40]:
          - link "Route Plans" [ref=e41] [cursor=pointer]:
            - /url: /admin/route-plans
        - listitem [ref=e46]:
          - link "Map Assets" [ref=e47] [cursor=pointer]:
            - /url: /admin/map-assets
      - generic [ref=e52]:
        - list [ref=e54]:
          - listitem [ref=e55]:
            - link "Profile" [ref=e56] [cursor=pointer]:
              - /url: /profile-settings
        - list [ref=e63]:
          - listitem [ref=e64]:
            - link "Sign Out" [ref=e65] [cursor=pointer]:
              - /url: /logout
    - main [ref=e70]:
      - generic [ref=e72]:
        - button "Hide admin navigation" [ref=e73]:
          - generic [ref=e74]: Toggle Sidebar
        - navigation "Breadcrumb" [ref=e75]:
          - generic [ref=e76]: APPROVED BOOKINGS
        - generic [ref=e77]:
          - button "Notifications (17 unread)" [ref=e78]:
            - generic [ref=e79]: 9+
          - button "Open Nguyễn Huỳnh Hoàng Uyên's account menu" [ref=e81]:
            - img "Nguyễn Huỳnh Hoàng Uyên's profile photo" [ref=e83]
      - generic [ref=e85]:
        - generic [ref=e86]:
          - heading "Assigned Transports" [level=1] [ref=e89]
          - paragraph [ref=e90]: Transports assigned for route planning.
        - generic [ref=e91]:
          - group "Approved bookings toolbar" [ref=e92]:
            - group "Approved booking filters" [ref=e94]:
              - generic [ref=e95]:
                - textbox "Search approved bookings" [ref=e97]:
                  - /placeholder: Search booking code or customer...
                - button "Plan status" [ref=e99]
                - button "Route status" [ref=e102]
                - button "Departure Date Range" [ref=e105]
              - paragraph [ref=e107]: "Departure: Latest first"
            - button "View" [ref=e109]
          - table [ref=e112]:
            - rowgroup [ref=e113]:
              - row [ref=e114]:
                - columnheader "TRANSPORT PLAN CODE" [ref=e115]
                - columnheader "Booking Reference" [ref=e116]
                - columnheader "Customer" [ref=e117]
                - columnheader "Requested route" [ref=e118]
                - columnheader "Horses" [ref=e119]
                - columnheader [ref=e120]:
                  - button "Departure" [ref=e121]:
                    - text: Departure
                    - generic [aria-hidden] [ref=e122]: ▼
                - columnheader "Transport plan" [ref=e123]
                - columnheader "Primary route" [ref=e124]
                - columnheader [ref=e125]
            - rowgroup [ref=e126]:
              - row [ref=e127]:
                - cell [ref=e128]:
                  - link "TP-20261109-6026" [ref=e129] [cursor=pointer]:
                    - /url: /admin/approved-bookings/8e798fe4-0506-43e4-b518-83954c8fca2a
                - cell [ref=e130]:
                  - link "REQ-20261109-6838" [ref=e131] [cursor=pointer]:
                    - /url: /admin/approved-bookings/8e798fe4-0506-43e4-b518-83954c8fca2a
                - cell [ref=e132]:
                  - generic [ref=e133]:
                    - paragraph [ref=e134]: Bat Quy Quan
                    - paragraph [ref=e135]: CUS-20261102-6901
                - cell [ref=e136]:
                  - generic [ref=e137]:
                    - paragraph [ref=e138]: "From: 43, 286 01 Žleby, Czechia (Czechia)"
                    - paragraph [ref=e139]: "To: Ausbau 5, 19288 Alt Krenzlin, Germany (Germany)"
                - cell "2" [ref=e140]
                - cell "26 Sept 2027" [ref=e141]
                - cell "Approved" [ref=e142]
                - cell "Confirmed" [ref=e144]
                - cell [ref=e146]:
                  - button "Actions for REQ-20261109-6838" [ref=e147]
              - row [ref=e148]:
                - cell [ref=e149]:
                  - link "TP-20261110-8375" [ref=e150] [cursor=pointer]:
                    - /url: /admin/approved-bookings/6f179e02-3bc0-4afb-b1c1-e9a151a52f06
                - cell [ref=e151]:
                  - link "REQ-20261110-7440" [ref=e152] [cursor=pointer]:
                    - /url: /admin/approved-bookings/6f179e02-3bc0-4afb-b1c1-e9a151a52f06
                - cell [ref=e153]:
                  - generic [ref=e154]:
                    - paragraph [ref=e155]: Bat Quy Quan
                    - paragraph [ref=e156]: CUS-20261102-6901
                - cell [ref=e157]:
                  - generic [ref=e158]:
                    - paragraph [ref=e159]: "From: 43, 286 01 Žleby, Czechia (Czechia)"
                    - paragraph [ref=e160]: "To: Ausbau 5, 19288 Alt Krenzlin, Germany (Germany)"
                - cell "2" [ref=e161]
                - cell "22 Apr 2027" [ref=e162]
                - cell "Approved" [ref=e163]
                - cell "Not created" [ref=e165]
                - cell [ref=e166]:
                  - button "Actions for REQ-20261110-7440" [ref=e167]
              - row [ref=e168]:
                - cell [ref=e169]:
                  - link "TP-20261109-0365" [ref=e170] [cursor=pointer]:
                    - /url: /admin/approved-bookings/a1028380-2af2-44a0-b6f7-fc76dde00826
                - cell [ref=e171]:
                  - link "REQ-20261109-4693" [ref=e172] [cursor=pointer]:
                    - /url: /admin/approved-bookings/a1028380-2af2-44a0-b6f7-fc76dde00826
                - cell [ref=e173]:
                  - generic [ref=e174]:
                    - paragraph [ref=e175]: Bat Quy Quan
                    - paragraph [ref=e176]: CUS-20261102-6901
                - cell [ref=e177]:
                  - generic [ref=e178]:
                    - paragraph [ref=e179]: "From: 43, 286 01 Žleby, Czechia (Czechia)"
                    - paragraph [ref=e180]: "To: Ausbau 5, 19288 Alt Krenzlin, Germany (Germany)"
                - cell "2" [ref=e181]
                - cell "26 Jan 2027" [ref=e182]
                - cell "Approved" [ref=e183]
                - cell "Confirmed" [ref=e185]
                - cell [ref=e187]:
                  - button "Actions for REQ-20261109-4693" [ref=e188]
              - row [ref=e189]:
                - cell [ref=e190]:
                  - link "TP-20261109-6418" [ref=e191] [cursor=pointer]:
                    - /url: /admin/approved-bookings/89db30a9-b5fb-40ea-a84a-21a5ede7205b
                - cell [ref=e192]:
                  - link "REQ-20261109-7246" [ref=e193] [cursor=pointer]:
                    - /url: /admin/approved-bookings/89db30a9-b5fb-40ea-a84a-21a5ede7205b
                - cell [ref=e194]:
                  - generic [ref=e195]:
                    - paragraph [ref=e196]: Bat Quy Quan
                    - paragraph [ref=e197]: CUS-20261102-6901
                - cell [ref=e198]:
                  - generic [ref=e199]:
                    - paragraph [ref=e200]: "From: 43, 286 01 Žleby, Czechia (Czechia)"
                    - paragraph [ref=e201]: "To: Ausbau 5, 19288 Alt Krenzlin, Germany (Germany)"
                - cell "2" [ref=e202]
                - cell "22 Jan 2027" [ref=e203]
                - cell "Approved" [ref=e204]
                - cell "Draft" [ref=e206]
                - cell [ref=e208]:
                  - button "Actions for REQ-20261109-7246" [ref=e209]
              - row [ref=e210]:
                - cell [ref=e211]:
                  - link "TP-20261109-1622" [ref=e212] [cursor=pointer]:
                    - /url: /admin/approved-bookings/0c54496b-0c82-4b2b-b822-5de6d0f05bd3
                - cell [ref=e213]:
                  - link "REQ-20261109-6794" [ref=e214] [cursor=pointer]:
                    - /url: /admin/approved-bookings/0c54496b-0c82-4b2b-b822-5de6d0f05bd3
                - cell [ref=e215]:
                  - generic [ref=e216]:
                    - paragraph [ref=e217]: Bat Quy Quan
                    - paragraph [ref=e218]: CUS-20261102-6901
                - cell [ref=e219]:
                  - generic [ref=e220]:
                    - paragraph [ref=e221]: "From: 43, 286 01 Žleby, Czechia (Czechia)"
                    - paragraph [ref=e222]: "To: Ausbau 5, 19288 Alt Krenzlin, Germany (Germany)"
                - cell "2" [ref=e223]
                - cell "12 Jan 2027" [ref=e224]
                - cell "Approved" [ref=e225]
                - cell "Confirmed" [ref=e227]
                - cell [ref=e229]:
                  - button "Actions for REQ-20261109-6794" [ref=e230]
              - row [ref=e231]:
                - cell [ref=e232]:
                  - link "TP-20261109-0445" [ref=e233] [cursor=pointer]:
                    - /url: /admin/approved-bookings/fc6f29d7-178b-4509-b19c-25f18eb8a24d
                - cell [ref=e234]:
                  - link "REQ-20261109-3938" [ref=e235] [cursor=pointer]:
                    - /url: /admin/approved-bookings/fc6f29d7-178b-4509-b19c-25f18eb8a24d
                - cell [ref=e236]:
                  - generic [ref=e237]:
                    - paragraph [ref=e238]: Bat Quy Quan
                    - paragraph [ref=e239]: CUS-20261102-6901
                - cell [ref=e240]:
                  - generic [ref=e241]:
                    - paragraph [ref=e242]: "From: 43, 286 01 Žleby, Czechia (Czechia)"
                    - paragraph [ref=e243]: "To: Ausbau 5, 19288 Alt Krenzlin, Germany (Germany)"
                - cell "2" [ref=e244]
                - cell "12 Jan 2027" [ref=e245]
                - cell "Approved" [ref=e246]
                - cell "Draft" [ref=e248]
                - cell [ref=e250]:
                  - button "Actions for REQ-20261109-3938" [ref=e251]
              - row [ref=e252]:
                - cell [ref=e253]:
                  - link "TP-20261105-9335" [ref=e254] [cursor=pointer]:
                    - /url: /admin/approved-bookings/c2269f48-78f0-48e2-93d8-29563233e0de
                - cell [ref=e255]:
                  - link "REQ-20261105-4267" [ref=e256] [cursor=pointer]:
                    - /url: /admin/approved-bookings/c2269f48-78f0-48e2-93d8-29563233e0de
                - cell [ref=e257]:
                  - generic [ref=e258]:
                    - paragraph [ref=e259]: Trinh Ng An Quan
                    - paragraph [ref=e260]: CUS-20261102-8263
                - cell [ref=e261]:
                  - generic [ref=e262]:
                    - paragraph [ref=e263]: "From: 1 La Marche, 36270 Eguzon-Chantome, France (France)"
                    - paragraph [ref=e264]: "To: Leśna 20, 62-660 Gmina Dąbie, Poland (Poland)"
                - cell "1" [ref=e265]
                - cell "08 Jan 2027" [ref=e266]
                - cell "Approved" [ref=e267]
                - cell "Draft" [ref=e269]
                - cell [ref=e271]:
                  - button "Actions for REQ-20261105-4267" [ref=e272]
              - row [ref=e273]:
                - cell [ref=e274]:
                  - link "TP-20261106-3967" [ref=e275] [cursor=pointer]:
                    - /url: /admin/approved-bookings/90d20986-dea6-4a6d-b28f-524273b296e1
                - cell [ref=e276]:
                  - link "REQ-20261106-6968" [ref=e277] [cursor=pointer]:
                    - /url: /admin/approved-bookings/90d20986-dea6-4a6d-b28f-524273b296e1
                - cell [ref=e278]:
                  - generic [ref=e279]:
                    - paragraph [ref=e280]: Bat Quy Quan
                    - paragraph [ref=e281]: CUS-20261102-6901
                - cell [ref=e282]:
                  - generic [ref=e283]:
                    - paragraph [ref=e284]: "From: Zgorzalska 3, 02-871 Warsaw, Poland (Poland)"
                    - paragraph [ref=e285]: "To: Breitewitz 1, 06773 Gräfenhainichen, Germany (Germany)"
                - cell "4" [ref=e286]
                - cell "06 Jan 2027" [ref=e287]
                - cell "Approved" [ref=e288]
                - cell "Confirmed" [ref=e290]
                - cell [ref=e292]:
                  - button "Actions for REQ-20261106-6968" [ref=e293]
              - row [ref=e294]:
                - cell [ref=e295]:
                  - link "TP-20261104-7647" [ref=e296] [cursor=pointer]:
                    - /url: /admin/approved-bookings/c098073a-498b-419d-ae26-536ba022425d
                - cell [ref=e297]:
                  - link "REQ-20261104-1906" [ref=e298] [cursor=pointer]:
                    - /url: /admin/approved-bookings/c098073a-498b-419d-ae26-536ba022425d
                - cell [ref=e299]:
                  - generic [ref=e300]:
                    - paragraph [ref=e301]: Trinh Ng An Quan
                    - paragraph [ref=e302]: CUS-20261102-8263
                - cell [ref=e303]:
                  - generic [ref=e304]:
                    - paragraph [ref=e305]: "From: Glacier de l'Invernet, 73640 Sainte-Foy-Tarentaise, France (France)"
                    - paragraph [ref=e306]: "To: Ghiacciaio del Rutor altiporto, Rifugio degli Angeli - Testa del Rutor, La Thuile AO, Italy (Italy)"
                - cell "4" [ref=e307]
                - cell "06 Jan 2027" [ref=e308]
                - cell "Approved" [ref=e309]
                - cell "Not created" [ref=e311]
                - cell [ref=e312]:
                  - button "Actions for REQ-20261104-1906" [ref=e313]
              - row [ref=e314]:
                - cell [ref=e315]:
                  - link "TP-20261104-4548" [ref=e316] [cursor=pointer]:
                    - /url: /admin/approved-bookings/d464ed73-f690-4828-9125-6cae57da4087
                - cell [ref=e317]:
                  - link "REQ-20261104-5590" [ref=e318] [cursor=pointer]:
                    - /url: /admin/approved-bookings/d464ed73-f690-4828-9125-6cae57da4087
                - cell [ref=e319]:
                  - generic [ref=e320]:
                    - paragraph [ref=e321]: Kim Ve Tuan
                    - paragraph [ref=e322]: CUS-20261102-9083
                - cell [ref=e323]:
                  - generic [ref=e324]:
                    - paragraph [ref=e325]: "From: Povrly 274, 403 32 Povrly, Czechia (Czechia)"
                    - paragraph [ref=e326]: "To: 1 La Foret Batee, 36170 Parnac, France (France)"
                - cell "2" [ref=e327]
                - cell "04 Jan 2027" [ref=e328]
                - cell "Approved" [ref=e329]
                - cell "Not created" [ref=e331]
                - cell [ref=e332]:
                  - button "Actions for REQ-20261104-5590" [ref=e333]
              - row [ref=e334]:
                - cell [ref=e335]:
                  - link "TP-20261103-8020" [ref=e336] [cursor=pointer]:
                    - /url: /admin/approved-bookings/7a5d4c2c-9b03-4698-961c-7f0b6934b823
                - cell [ref=e337]:
                  - link "REQ-20261103-8433" [ref=e338] [cursor=pointer]:
                    - /url: /admin/approved-bookings/7a5d4c2c-9b03-4698-961c-7f0b6934b823
                - cell [ref=e339]:
                  - generic [ref=e340]:
                    - paragraph [ref=e341]: Trinh Ng An Quan
                    - paragraph [ref=e342]: CUS-20261102-8263
                - cell [ref=e343]:
                  - generic [ref=e344]:
                    - paragraph [ref=e345]: "From: Caseificio Artigianale Pacioni, Contrada Monte, 10, 63071 Rotella AP, Italy (Italy)"
                    - paragraph [ref=e346]: "To: Oxford Caravans, Tiddington, OX9 2LH, United Kingdom (United Kingdom)"
                - cell "2" [ref=e347]
                - cell "03 Jan 2027" [ref=e348]
                - cell "Approved" [ref=e349]
                - cell "Not created" [ref=e351]
                - cell [ref=e352]:
                  - button "Actions for REQ-20261103-8433" [ref=e353]
              - row [ref=e354]:
                - cell [ref=e355]:
                  - link "TP-20261106-3127" [ref=e356] [cursor=pointer]:
                    - /url: /admin/approved-bookings/e4147502-ac63-41c0-a4ec-2bef2a80cae9
                - cell [ref=e357]:
                  - link "REQ-20261106-4296" [ref=e358] [cursor=pointer]:
                    - /url: /admin/approved-bookings/e4147502-ac63-41c0-a4ec-2bef2a80cae9
                - cell [ref=e359]:
                  - generic [ref=e360]:
                    - paragraph [ref=e361]: Bat Quy Quan
                    - paragraph [ref=e362]: CUS-20261102-6901
                - cell [ref=e363]:
                  - generic [ref=e364]:
                    - paragraph [ref=e365]: "From: Waen Farm, Newtown, Powys, WLS, United Kingdom (United Kingdom)"
                    - paragraph [ref=e366]: "To: Lower Woodhouse Farm, Knighton, Powys, WLS, United Kingdom (United Kingdom)"
                - cell "2" [ref=e367]
                - cell "28 Nov 2026" [ref=e368]
                - cell "Approved" [ref=e369]
                - cell "Confirmed" [ref=e371]
                - cell [ref=e373]:
                  - button "Actions for REQ-20261106-4296" [ref=e374]
              - row [ref=e375]:
                - cell [ref=e376]:
                  - link "TP-20261103-9872" [ref=e377] [cursor=pointer]:
                    - /url: /admin/approved-bookings/169901e3-5e49-45df-8727-e5659e2188d1
                - cell [ref=e378]:
                  - link "REQ-20261103-2120" [ref=e379] [cursor=pointer]:
                    - /url: /admin/approved-bookings/169901e3-5e49-45df-8727-e5659e2188d1
                - cell [ref=e380]:
                  - generic [ref=e381]:
                    - paragraph [ref=e382]: Trinh Ng An Quan
                    - paragraph [ref=e383]: CUS-20261102-8263
                - cell [ref=e384]:
                  - generic [ref=e385]:
                    - paragraph [ref=e386]: "From: United Kingdom (United Kingdom)"
                    - paragraph [ref=e387]: "To: Danson Stream, London, United Kingdom (United Kingdom)"
                - cell "2" [ref=e388]
                - cell "27 Nov 2026" [ref=e389]
                - cell "Approved" [ref=e390]
                - cell "Draft" [ref=e392]
                - cell [ref=e394]:
                  - button "Actions for REQ-20261103-2120" [ref=e395]
              - row [ref=e396]:
                - cell [ref=e397]:
                  - link "TP-20261103-8877" [ref=e398] [cursor=pointer]:
                    - /url: /admin/approved-bookings/b030ac9f-9ebd-453d-ba7e-eb9fabd59d15
                - cell [ref=e399]:
                  - link "REQ-20261103-6908" [ref=e400] [cursor=pointer]:
                    - /url: /admin/approved-bookings/b030ac9f-9ebd-453d-ba7e-eb9fabd59d15
                - cell [ref=e401]:
                  - generic [ref=e402]:
                    - paragraph [ref=e403]: Trinh Ng An Quan
                    - paragraph [ref=e404]: CUS-20261102-8263
                - cell [ref=e405]:
                  - generic [ref=e406]:
                    - paragraph [ref=e407]: "From: Edinburgh, SCT, United Kingdom (United Kingdom)"
                    - paragraph [ref=e408]: "To: City of London, ENG, United Kingdom (United Kingdom)"
                - cell "4" [ref=e409]
                - cell "26 Nov 2026" [ref=e410]
                - cell "Approved" [ref=e411]
                - cell "Confirmed" [ref=e413]
                - cell [ref=e415]:
                  - button "Actions for REQ-20261103-6908" [ref=e416]
          - generic [ref=e417]:
            - status [ref=e418]: Showing 1 to 14 of 14 entries
            - generic [ref=e419]:
              - generic [ref=e420]:
                - generic [ref=e421]: Rows per page
                - combobox "Approved bookings per page" [ref=e422]:
                  - generic: "20"
              - navigation "pagination" [ref=e423]:
                - list [ref=e424]:
                  - listitem [ref=e425]:
                    - button "Go to previous page" [disabled]:
                      - generic: Previous
                  - listitem [ref=e426]:
                    - button "1" [ref=e427]
                  - listitem [ref=e428]:
                    - button "Go to next page" [disabled]:
                      - generic: Next
  - region "Notifications alt+T"
```

# Test source

```ts
  64  |     return cliArg.trim()
  65  |   }
  66  | 
  67  |   return null
  68  | }
  69  | 
  70  | /**
  71  |  * Directly picks the Origin (Start) and Destination (End) markers on the map.
  72  |  *
  73  |  * Uses `data-marker-variant` (added to LocationMarker) to target exactly one
  74  |  * start and one end marker, immune to name collisions.
  75  |  *
  76  |  * Uses `dispatchEvent("click")` instead of Playwright `.click()` to avoid
  77  |  * triggering mouseenter → hover popup → map re-render → marker jitter.
  78  |  * The React onClick handler fires normally via dispatchEvent.
  79  |  */
  80  | async function pickEndpointsOnMap(page: Page, originName: string, destName: string) {
  81  |   console.log(`[route-plan-build] Selecting endpoints on map — Origin: "${originName}", Dest: "${destName}"`)
  82  | 
  83  |   // Primary: variant + exact aria-label (most precise)
  84  |   const originMarker = page.locator(`button[data-marker-variant="start"][aria-label="Show details for ${originName}"]`)
  85  |   const destMarker   = page.locator(`button[data-marker-variant="end"][aria-label="Show details for ${destName}"]`)
  86  | 
  87  |   // Fallback: variant only (always unique — exactly one start, one end per map)
  88  |   const originFallback = page.locator(`button[data-marker-variant="start"]`)
  89  |   const destFallback   = page.locator(`button[data-marker-variant="end"]`)
  90  | 
  91  |   // Wait for start marker to be attached (MapLibre may take a moment to render)
  92  |   await originMarker
  93  |     .waitFor({ state: "attached", timeout: 15000 })
  94  |     .catch(() => originFallback.waitFor({ state: "attached", timeout: 10000 }))
  95  | 
  96  |   // Allow MapLibre bounds-fitting animation to settle before interacting
  97  |   await page.waitForTimeout(1500)
  98  | 
  99  |   // 1. Click Origin via dispatchEvent — skips mouse-move/hover, no popup, no jitter
  100 |   const originBtn = (await originMarker.count().then(n => n > 0).catch(() => false))
  101 |     ? originMarker
  102 |     : originFallback
  103 |   await originBtn.dispatchEvent("click")
  104 | 
  105 |   // Verify Origin registered as source
  106 |   const sourcePrompt = page.locator("text=/Source selected:.*Please choose a destination/i")
  107 |   try {
  108 |     await sourcePrompt.waitFor({ state: "visible", timeout: 5000 })
  109 |   } catch {
  110 |     console.log("[route-plan-build] Source not set — retrying origin click...")
  111 |     await originBtn.dispatchEvent("click")
  112 |     await sourcePrompt.waitFor({ state: "visible", timeout: 8000 })
  113 |   }
  114 | 
  115 |   // 2. Click Destination via dispatchEvent
  116 |   const destBtn = (await destMarker.count().then(n => n > 0).catch(() => false))
  117 |     ? destMarker
  118 |     : destFallback
  119 |   await destBtn.dispatchEvent("click")
  120 | 
  121 |   // Wait for segment or BCP proposal to appear
  122 |   const bcpConfirmBtn = page.getByRole("button", { name: /Confirm & Auto-Split Route/i })
  123 |   const segmentCard = page.locator("[data-slot='card']", { hasText: /Segment/i }).first()
  124 |   try {
  125 |     await Promise.race([
  126 |       bcpConfirmBtn.waitFor({ state: "visible", timeout: 6000 }),
  127 |       segmentCard.waitFor({ state: "visible", timeout: 6000 }),
  128 |     ])
  129 |   } catch {
  130 |     console.log("[route-plan-build] No segment/BCP yet — retrying destination click...")
  131 |     await destBtn.dispatchEvent("click")
  132 |   }
  133 | 
  134 |   // 3. If BCP auto-split proposal appears, confirm it
  135 |   if (await bcpConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  136 |     console.log("[route-plan-build] Cross-border BCP detected, confirming auto-split...")
  137 |     await bcpConfirmBtn.click()
  138 |     await bcpConfirmBtn.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {})
  139 |   }
  140 | }
  141 | 
  142 | test("route-plan-build flow", async ({ page }) => {
  143 |   const targetPlanCode = getTargetTransportPlanCode()
  144 |   console.log(`[route-plan-build] Target Transport Plan parameter: ${targetPlanCode ?? "(auto-detect latest)"}`)
  145 | 
  146 |   // 1. Sign in as Fleet Route Coordinator
  147 |   await page.goto("/")
  148 |   await page.locator("header").getByRole("link", { name: "Sign in" }).click()
  149 |   await page.getByRole("textbox", { name: "Email address" }).fill("hoanguyen91011@gmail.com")
  150 |   await page.getByRole("textbox", { name: "Password" }).fill("pegaxusDemo@123")
  151 |   await page.getByRole("button", { name: "Sign in" }).click()
  152 | 
  153 |   // 2. Go to Approved Bookings
  154 |   await page.getByRole("link", { name: "Approved Bookings" }).click()
  155 |   await page.waitForURL(/\/admin\/approved-bookings/, { timeout: 15000 })
  156 |   await page.locator("table tbody tr").first().waitFor({ state: "visible", timeout: 15000 })
  157 | 
  158 |   // 3. Locate the target row for the given Transport Plan Code (or first row).
  159 |   //    The latest TP is always at the top of the table — no search/filter needed.
  160 |   const targetRow = targetPlanCode
  161 |     ? page.locator("tbody tr", { has: page.getByRole("link", { name: targetPlanCode, exact: false }) }).first()
  162 |     : page.locator("tbody tr", { has: page.getByRole("button", { name: /^Actions for (REQ|BK)-/i }) }).first()
  163 | 
> 164 |   await targetRow.waitFor({ state: "visible", timeout: 15000 })
      |                   ^ TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
  165 | 
  166 |   // Extract Plan Code and Requested Route from the table row
  167 |   const planCodeLink = targetRow.locator("td").first().getByRole("link")
  168 |   const resolvedPlanCode = (await planCodeLink.textContent())?.trim() ?? targetPlanCode ?? "Unknown TP"
  169 |   console.log(`[route-plan-build] Selected Transport Plan: ${resolvedPlanCode}`)
  170 | 
  171 |   // 4. Open Action menu on that target row and click "Create Primary Route"
  172 |   const bookingActionBtn = targetRow.getByRole("button", { name: /^Actions for (REQ|BK)-/i }).first()
  173 |   await bookingActionBtn.click()
  174 | 
  175 |   await page.getByRole("menuitem", { name: "Create Primary Route" }).click()
  176 |   await page.waitForURL(/\/route-plans\/new\//, { timeout: 15000 })
  177 | 
  178 |   // 5. Extract Origin & Destination dynamically from Step 0 (RoutePlanEndpointsStep)
  179 |   const originCard = page.locator("[data-slot='card']", {
  180 |     has: page.locator("[data-slot='card-title']", { hasText: /^Origin$/i }),
  181 |   })
  182 |   const destCard = page.locator("[data-slot='card']", {
  183 |     has: page.locator("[data-slot='card-title']", { hasText: /^Destination$/i }),
  184 |   })
  185 | 
  186 |   await originCard.waitFor({ state: "visible", timeout: 10000 })
  187 |   await destCard.waitFor({ state: "visible", timeout: 10000 })
  188 | 
  189 |   const originName = (await originCard.locator("p.text-lg").textContent())?.trim() ?? "43"
  190 |   const originSub = (await originCard.locator("p.text-muted-foreground").textContent())?.trim() ?? ""
  191 | 
  192 |   const destName = (await destCard.locator("p.text-lg").textContent())?.trim() ?? "Ausbau 5"
  193 |   const destSub = (await destCard.locator("p.text-muted-foreground").textContent())?.trim() ?? ""
  194 | 
  195 |   const originKeyword = extractSearchKeyword(originName) || "43"
  196 |   const destKeyword = extractSearchKeyword(destName) || "aus"
  197 | 
  198 |   console.log(`[route-plan-build] Extracted Origin: "${originName}" (${originSub}) -> Search keyword: "${originKeyword}"`)
  199 |   console.log(`[route-plan-build] Extracted Destination: "${destName}" (${destSub}) -> Search keyword: "${destKeyword}"`)
  200 | 
  201 |   // Step 0 -> Click Next to enter Route Segments Builder
  202 |   await page.getByRole("button", { name: "Next" }).click()
  203 | 
  204 |   // 6. Step 1 (Route Segments Builder): Pick Pickup & Destination locations directly on the map
  205 |   // Pass the FULL location name so pickEndpointsOnMap matches the exact aria-label
  206 |   // ("Show details for <name>") — avoids selecting the wrong marker when multiple
  207 |   // locations share the same short prefix (e.g. two "Ausbau 5" entries).
  208 |   await pickEndpointsOnMap(page, originName, destName)
  209 | 
  210 |   // Wait for route segment calculation & assign vehicle
  211 |   const selectVehicleBtn = page.getByRole("button", { name: /Select vehicle/i }).first()
  212 |   await selectVehicleBtn.waitFor({ state: "visible", timeout: 20000 })
  213 | 
  214 |   while (await page.getByRole("button", { name: /Select vehicle/i }).first().isVisible({ timeout: 2000 }).catch(() => false)) {
  215 |     await page.getByRole("button", { name: /Select vehicle/i }).first().click()
  216 |     const vehicleDialog = page.getByRole("dialog", { name: /Select vehicles/i })
  217 |     await vehicleDialog.waitFor({ state: "visible", timeout: 5000 })
  218 |     const targetCheckbox = vehicleDialog.getByRole("checkbox", { name: /Mercedes-Benz Actros Horse/i })
  219 |     if (await targetCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
  220 |       await targetCheckbox.check()
  221 |     } else {
  222 |       await vehicleDialog.getByRole("checkbox").first().check()
  223 |     }
  224 |     await vehicleDialog.getByRole("button", { name: "Confirm vehicles" }).click()
  225 |     await vehicleDialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {})
  226 | 
  227 |     // Handle "Vehicle country differs from departure" confirmation if prompted
  228 |     const continueSelectingBtn = page.getByRole("button", { name: "Continue selecting" })
  229 |     if (await continueSelectingBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  230 |       await continueSelectingBtn.click()
  231 |       await continueSelectingBtn.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {})
  232 |     }
  233 |   }
  234 | 
  235 |   // Set rest time
  236 |   const restInputs = page.getByRole("spinbutton", { name: "Rest Time (Minutes)" })
  237 |   const restCount = await restInputs.count()
  238 |   for (let i = 0; i < restCount; i++) {
  239 |     await restInputs.nth(i).fill(i === 0 ? "15" : "30")
  240 |   }
  241 | 
  242 |   // 7. Step 2 (Save / Summary) -> Save Draft
  243 |   await page.getByRole("button", { name: "Next" }).click()
  244 |   const saveDraftBtn = page.getByRole("button", { name: "Save Draft" })
  245 |   await saveDraftBtn.waitFor({ state: "visible", timeout: 10000 })
  246 |   await saveDraftBtn.click()
  247 |   await page.waitForURL(/\/route-plans/, { timeout: 20000 })
  248 |   // Backend needs ~15s to fully commit the saved route plan before subsequent steps
  249 |   await page.waitForTimeout(15000)
  250 | 
  251 |   // 8. Create Contingency / Backup Route
  252 |   await page.goto("http://localhost:5173/admin/approved-bookings")
  253 |   await page.waitForURL(/\/admin\/approved-bookings/, { timeout: 15000 })
  254 | 
  255 |   // The resolved TP row is always visible at the top — no search/filter needed
  256 |   const backupTargetRow = page.locator("tbody tr", { hasText: resolvedPlanCode }).first()
  257 |   await backupTargetRow.waitFor({ state: "visible", timeout: 15000 })
  258 | 
  259 |   const backupActionBtn = backupTargetRow.getByRole("button", { name: /^Actions for (REQ|BK)-/i }).first()
  260 |   await backupActionBtn.click()
  261 |   await page.getByRole("menuitem", { name: "View Transport" }).click()
  262 |   await page.waitForURL(/\/admin\/approved-bookings\/[0-9a-f-]{36}/i, { timeout: 15000 })
  263 | 
  264 |   const addBackupLink = page.getByRole("link", { name: "Add Backup Route" })
```