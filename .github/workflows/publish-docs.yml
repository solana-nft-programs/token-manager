name: Publish Docs

env:
  CARGO_TERM_COLOR: always
  RUST_TOOLCHAIN: nightly-2021-12-10
  NPM_AUTH_TOKEN: ${{ secrets.NPM_PUBLISH_TOKEN }}

jobs:
  site:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - uses: cachix/install-nix-action@v16
        with:
          install_url: https://nixos-nix-install-tests.cachix.org/serve/i6laym9jw3wg9mw6ncyrk6gjx4l34vvx/install
          install_options: "--tarball-url-prefix https://nixos-nix-install-tests.cachix.org/serve"
          extra_nix_config: |
            experimental-features = nix-command flakes
      - name: Setup Cachix
        uses: cachix/cachix-action@v10
        with:
          name: cardinal-token-manager
          extraPullNames: cardinal
          authToken: ${{ secrets.CACHIX_AUTH_TOKEN }}

      - name: Get yarn cache directory path
        id: yarn-cache-dir-path
        run: echo "::set-output name=dir::$(yarn config get cacheFolder)"
      - name: Yarn Cache
        uses: actions/cache@v2
        with:
          path: ${{ steps.yarn-cache-dir-path.outputs.dir }}
          key: ${{ runner.os }}-modules-${{ hashFiles('**/yarn.lock') }}
          restore-keys: |
            ${{ runner.os }}-modules-

      - name: Install Yarn dependencies
        run: yarn install
      # - name: Parse IDLs
      #   run: nix shell .#ci --command yarn idl:generate
      - run: yarn docs:generate
      - run: cp -R images/ site/

      - name: Deploy 🚀
        uses: JamesIves/github-pages-deploy-action@v4.2.5
        with:
          branch: gh-pages
          folder: site
