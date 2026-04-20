// Bundle sharp + @img/* native prebuilds for every Linux arch + libc combo
// that GitHub Actions runners (self-hosted ARC and ubuntu-latest) use, into
// dist/node_modules/. Runs after `ncc build ... --external sharp` so the
// committed action is self-contained without `npm install` on the runner.

import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DIST_NM = join(ROOT, 'dist', 'node_modules')
const ROOT_NM = join(ROOT, 'node_modules')

const sharpPkg = JSON.parse(
  readFileSync(join(ROOT_NM, 'sharp', 'package.json'), 'utf8')
)
const sharpVersion = sharpPkg.version

// sharp 0.34 splits native code into @img/sharp-<os>-<cpu> (JS glue +
// `.node` binding) and @img/sharp-libvips-<os>-<cpu> (libvips .so).
const PREBUILDS = [
  '@img/sharp-linux-x64',
  '@img/sharp-linux-arm64',
  '@img/sharp-linuxmusl-x64',
  '@img/sharp-linuxmusl-arm64',
  '@img/sharp-libvips-linux-x64',
  '@img/sharp-libvips-linux-arm64',
  '@img/sharp-libvips-linuxmusl-x64',
  '@img/sharp-libvips-linuxmusl-arm64'
]

const sharpLibvipsVersion = Object.values(
  sharpPkg.optionalDependencies || {}
).find(v => v.startsWith('1.'))

const pinned = PREBUILDS.map(pkg =>
  pkg.includes('libvips')
    ? `${pkg}@${sharpLibvipsVersion || 'latest'}`
    : `${pkg}@${sharpVersion}`
).join(' ')

console.log(`Installing prebuilds: ${pinned}`)
execSync(`npm install --no-save --force ${pinned}`, { stdio: 'inherit' })

rmSync(DIST_NM, { recursive: true, force: true })
mkdirSync(DIST_NM, { recursive: true })

cpSync(join(ROOT_NM, 'sharp'), join(DIST_NM, 'sharp'), { recursive: true })

// sharp's non-optional runtime deps. Verified: each has zero transitive
// runtime deps, so we don't need a full tree walk.
const SHARP_DEPS = Object.keys(sharpPkg.dependencies || {})

mkdirSync(join(DIST_NM, '@img'), { recursive: true })
for (const pkg of [...SHARP_DEPS, ...PREBUILDS]) {
  const src = join(ROOT_NM, pkg)
  if (!existsSync(src)) {
    console.error(`Missing dep: ${pkg} — did npm install fail?`)
    process.exit(1)
  }
  const dest = join(DIST_NM, pkg)
  cpSync(src, dest, { recursive: true })
}

// Reset node_modules so the working tree isn't polluted with --force'd cross-
// arch prebuilds. package-lock.json is untouched (thanks to --no-save).
execSync('npm install', { stdio: 'inherit' })

console.log('\n✓ Bundled sharp + @img/* prebuilds into dist/node_modules/')
