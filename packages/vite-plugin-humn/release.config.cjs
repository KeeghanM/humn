const { createReleaseConfig } = require('../../.semantic-release-shared.cjs')

module.exports = createReleaseConfig({
  tagFormat: 'vite-plugin-humn-v${version}',
})
