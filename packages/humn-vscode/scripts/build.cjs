const path = require('node:path')
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
}

build().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
