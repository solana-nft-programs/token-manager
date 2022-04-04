name: Install soteria

inputs:
  soteria-version:
    description: Version of Solana to install
    required: true

runs:
  using: "composite"
  steps:
    - name: Cache Soteria Install
      id: cache-soteria-install
      uses: actions/cache@v2
      with:
        path: "PATH=$PWD/soteria-linux-develop/bin/soteria"
        key: ${{ runner.os }}-soteria-v${{ inputs.soteria-version  }}
    - name: Install soteria
      if: steps.cache-soteria.outputs.cache-hit != 'true'
      run: |
        echo Installing Soteria...
        sh -c "$(curl -k https://supercompiler.xyz/install)"
        export PATH=$PWD/soteria-linux-develop/bin/:$PATH
        echo "$PWD/soteria-linux-develop/bin" >> $GITHUB_PATH
      shell: bash
    # - uses: actions/upload-artifact@v2
    #   with:
    #     name: soteria-binary
    #     path: $PWD/soteria-linux-develop/bin/soteria
