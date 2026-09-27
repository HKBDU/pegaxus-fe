import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import { createTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel } from "@tanstack/react-table"

const module = { exports: {} }
const source = readFileSync(new URL("../mock-data.ts", import.meta.url), "utf8")
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
vm.runInNewContext(compiled, { module, exports: module.exports })
const { demoAccounts, defaultAccountFilters, filterAccounts } = module.exports

test("search matches name, email and employee code without case sensitivity", () => {
  for (const search of [" JOHN DAVIS ", "john.davis@example.com", "emp-001"]) {
    assert.equal(filterAccounts(demoAccounts, { ...defaultAccountFilters, search })[0].id, "demo-1")
  }
  assert.equal(filterAccounts(demoAccounts, { ...defaultAccountFilters, search: "not-found" }).length, 0)
})

test("each filter and combined filters select the expected accounts", () => {
  for (const [key, value, count] of [["role", "DRIVER", 1], ["accountType", "CUSTOMER", 3], ["verification", "UNVERIFIED", 3], ["status", "INACTIVE", 1]]) {
    assert.equal(filterAccounts(demoAccounts, { ...defaultAccountFilters, [key]: value }).length, count)
  }
  const combined = filterAccounts(demoAccounts, { ...defaultAccountFilters, accountType: "EMPLOYEE", verification: "UNVERIFIED", status: "ACTIVE" })
  assert.equal(combined.length, 1)
  assert.equal(combined[0].id, "demo-3")
  assert.equal(filterAccounts(demoAccounts, defaultAccountFilters).length, 8)
})

test("manager table sorting, page size and page selection use stable account IDs", () => {
  let state = { sorting: [{ id: "updatedAt", desc: true }], pagination: { pageIndex: 0, pageSize: 5 }, rowSelection: {} }
  const table = createTable({
    data: demoAccounts,
    columns: [{ accessorKey: "fullName" }, { accessorKey: "updatedAt" }],
    state, getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    onStateChange: () => {}, renderFallbackValue: null,
    onRowSelectionChange: (updater) => {
      state = { ...state, rowSelection: typeof updater === "function" ? updater(state.rowSelection) : updater }
      table.setOptions((options) => ({ ...options, state }))
    },
  })
  assert.equal(table.getRowModel().rows.length, 5)
  assert.equal(table.getRowModel().rows[0].id, "demo-1")
  table.toggleAllPageRowsSelected(true)
  assert.equal(Object.keys(state.rowSelection).length, 5)
  assert.equal(table.getIsAllPageRowsSelected(), true)
  table.getRowModel().rows[0].toggleSelected(false)
  assert.equal(table.getIsSomePageRowsSelected(), true)
  state = { ...state, pagination: { pageIndex: 1, pageSize: 5 } }
  table.setOptions((options) => ({ ...options, state }))
  assert.equal(table.getRowModel().rows.length, 3)
  assert.equal(table.getRowModel().rows[0].id, "demo-6")
  state = { ...state, pagination: { pageIndex: 0, pageSize: 10 }, sorting: [{ id: "fullName", desc: false }] }
  table.setOptions((options) => ({ ...options, state }))
  assert.equal(table.getRowModel().rows.length, 8)
  assert.equal(table.getRowModel().rows[0].original.fullName, "Alex Carter")
})
