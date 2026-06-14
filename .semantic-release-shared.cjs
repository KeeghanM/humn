function createReleaseConfig({ packageVsix = false, tagFormat }) {
  if (!tagFormat) throw new Error('createReleaseConfig requires tagFormat')

  return {
    extends: 'semantic-release-monorepo',
    branches: ['main'],
    tagFormat,
    plugins: [
      ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
      [
        '@semantic-release/release-notes-generator',
        {
          preset: 'conventionalcommits',
          writerOpts: { commitsSort: ['subject', 'scope'] },
        },
      ],
      ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
      packageVsix
        ? ['@semantic-release/npm', { npmPublish: false }]
        : '@semantic-release/npm',
      ...(packageVsix
        ? [['semantic-release-vsce', { packageVsix: true }]]
        : []),
      '@semantic-release/github',
      [
        '@semantic-release/git',
        {
          assets: ['package.json', 'CHANGELOG.md'],
          message:
            'chore(release): ${nextRelease.version}\n\n${nextRelease.notes}',
        },
      ],
    ],
  }
}

module.exports = { createReleaseConfig }
