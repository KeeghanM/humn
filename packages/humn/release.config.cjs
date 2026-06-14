const { createReleaseConfig } = require('../../.semantic-release-shared.cjs')

module.exports = createReleaseConfig({ tagFormat: 'humn-v${version}' })
