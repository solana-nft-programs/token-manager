# Time invalidator crank

This is a job or "crank" that runs every few seconds and looks to expire old time-invalidators. This is necessary to trigger to invalidation, and for this action, the crank that triggers this invalidation receives a small invalidation reward in the form of Sol that is in the accounts it closes.

In the case of most token-managers, this comes in the form of the rent in the token-manager itself. In the case of token-managers that get invalidated but not closed, this reward is a fixed amount of Sol determined by the program.

This crank runs on AWS lambda deployed using serverless. To run locally follow the steps below. NOTE npm using - serverless does not support yarn PNP last I checked

```
1. git clone https://github.com/solana-nft-programs/token-manager.git

2. cd api

# NOTE THIS IS USING NPM
3. npm install

4. ts-node time-invalidator-crank.ts
```
