const path = require('node:path')
const fs = require('node:fs')
const esbuild = require('esbuild')

const packageRoot = path.join(__dirname, '..')

async function build() {
  await esbuild.build({
    entryPoints: [path.join(packageRoot, 'src', 'extension.cjs')],
    outfile: path.join(packageRoot, 'dist', 'extension.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['vscode'],
    sourcemap: true,
  })

  await esbuild.build({
    entryPoints: [
      path.join(packageRoot, '..', 'humn-language-server', 'src', 'server.cjs'),
    ],
    outfile: path.join(packageRoot, 'dist', 'server.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    sourcemap: true,
  })

  // Copy TypeScript standard library d.ts files so they are packaged inside the VSIX
  const distLibDir = path.join(packageRoot, 'dist', 'lib')
  fs.mkdirSync(distLibDir, { recursive: true })

  const tsLibSourceDir = path.join(
    packageRoot,
    '../../node_modules/typescript/lib',
  )
  if (fs.existsSync(tsLibSourceDir)) {
    const files = fs.readdirSync(tsLibSourceDir)
    for (const file of files) {
      if (file.endsWith('.d.ts')) {
        fs.copyFileSync(
          path.join(tsLibSourceDir, file),
          path.join(distLibDir, file),
        )
      }
    }
  }
}

build().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
