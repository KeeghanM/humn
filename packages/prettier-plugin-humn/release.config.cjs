const { createReleaseConfig } = require('../../.semantic-release-shared.cjs')

module.exports = createReleaseConfig({
  tagFormat: 'prettier-plugin-humn-v${version}',
})
