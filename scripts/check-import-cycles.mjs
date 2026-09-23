import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(projectRoot, 'src')
const extensions = ['.ts', '.tsx']

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory()
      ? collectFiles(path)
      : extensions.includes(extname(path))
        ? [path]
        : []
  })
}

function resolveImport(importer, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null

  const basePath = specifier.startsWith('@/')
    ? join(sourceRoot, specifier.slice(2))
    : resolve(dirname(importer), specifier)
  const candidates = [
    basePath,
    ...extensions.map((extension) => `${basePath}${extension}`),
    ...extensions.map((extension) => join(basePath, `index${extension}`)),
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

const files = collectFiles(sourceRoot)
const graph = new Map(
  files.map((file) => {
    const source = readFileSync(file, 'utf8')
    const imports = [
      ...source.matchAll(/(?:from\s+|import\s*\(?\s*)['"]([^'"]+)['"]/g),
    ]
      .map((match) => resolveImport(file, match[1]))
      .filter(Boolean)
    return [file, imports]
  }),
)

const visiting = new Set()
const visited = new Set()
const cycles = []

function visit(file, path = []) {
  if (visiting.has(file)) {
    cycles.push([...path.slice(path.indexOf(file)), file])
    return
  }
  if (visited.has(file)) return

  visiting.add(file)
  for (const dependency of graph.get(file) ?? []) visit(dependency, [...path, file])
  visiting.delete(file)
  visited.add(file)
}

for (const file of files) visit(file)

if (cycles.length > 0) {
  for (const cycle of cycles) {
    console.error(cycle.map((file) => file.replace(`${projectRoot}\\`, '')).join(' -> '))
  }
  process.exitCode = 1
} else {
  console.log(`No circular imports found across ${files.length} source files.`)
}
