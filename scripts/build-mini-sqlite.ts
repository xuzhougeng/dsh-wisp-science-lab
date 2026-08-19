import { rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeMiniSqlite } from '../tests/mini-fixture.ts'

const dest = join(dirname(fileURLToPath(import.meta.url)), '..', 'testdata', 'mini.sqlite')
rmSync(dest, { force: true })
writeMiniSqlite(dest)
console.log(`wrote ${dest}`)
