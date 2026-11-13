import type { ApiMock } from "./api-mock"
import type { TestHorse } from "./test-data"

/**
 * A small fake of `GET /horses`: honours `search`, `pageIndex` and `pageSize` like the real endpoint, so the screens that
 * search and page through the customer's horses can be exercised without hard-coding one canned page.
 */
export function fakeHorseList(api: ApiMock, horses: TestHorse[]) {
  api.ok("GET", "/horses", (request) => {
    const search = (request.query.search ?? "").trim().toLowerCase()
    const pageSize = Number(request.query.pageSize ?? 10)
    const pageIndex = Number(request.query.pageIndex ?? 1)
    const matching = horses.filter((horse) =>
      !search || [horse.horseName, horse.microchipNumber, horse.passportNumber].some((value) => value.toLowerCase().includes(search)),
    )
    return {
      items: matching.slice((pageIndex - 1) * pageSize, pageIndex * pageSize),
      pageIndex,
      pageSize,
      totalItems: matching.length,
      totalPages: Math.max(1, Math.ceil(matching.length / pageSize)),
    }
  })
}
