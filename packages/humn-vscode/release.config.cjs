const { createReleaseConfig } = require('../../.semantic-release-shared.cjs')

module.exports = createReleaseConfig({
  packageVsix: true,
  tagFormat: 'humn-vscode-v${version}',
})
