name: Test report

on:
  workflow_dispatch: {}

env:
  CARGO_TERM_COLOR: always
  SOLANA_VERSION: 1.8.5
  ANCHOR_GIT: https://github.com/project-serum/anchor
  RUST_TOOLCHAIN: nightly-2021-12-10
  NPM_AUTH_TOKEN: ${{ secrets.NPM_PUBLISH_TOKEN }}

jobs:
  test:
    runs-on: ubuntu-latest
    name: Publish test results
    steps:
      - uses: actions/checkout@v3
      - name: Install Yarn dependencies
        run: yarn install

      - name: Publish Unit Test Results
        uses: EnricoMi/publish-unit-test-result-action/composite@v1
        if: always()
        with:
          files: tests/out.xml
