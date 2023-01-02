org: jpbogle
app: cardinal
service: cardinal-token-manager
frameworkVersion: "2 || 3"

provider:
  name: aws
  runtime: nodejs16.x
  lambdaHashingVersion: "20201221"
  environment:
    MAINNET_PRIMARY: ${param:MAINNET_PRIMARY}

package:
  individually: true
  exclude:
    - "./node_modules"
    - "./package-lock.json"
    - "./yarn.lock"

functions:
  time-invalidator-crank:
    timeout: 30
    environment:
      SOLANA_CRANK_KEY: ${ssm:/SOLANA_CRANK_KEY~true}
      CRANK_DISABLED: ${param:CRANK_DISABLED,false}
      CRANK_PARALLEL_DISABLED: ${param:CRANK_PARALLEL_DISABLED,false}
      CRANK_PARALLEL_MAX_CHUNKS: ${param:CRANK_PARALLEL_MAX_CHUNKS,false}
    handler: time-invalidator-crank/handler.invalidate

stepFunctions:
  stateMachines:
    everyminute:
      type: EXPRESS
      events:
        - schedule:
            rate: rate(1 minute)
      id: time-invalidator-crank-${opt:stage}
      name: time-invalidator-crank-${opt:stage}
      definition:
        StartAt: Create Loop Items
        States:
          Create Loop Items:
            Type: Pass
            Next: Loop
            Result:
              items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          Loop:
            Type: Map
            ItemsPath: "$.items"
            MaxConcurrency: 1
            Iterator:
              StartAt: Wait 5 Seconds
              States:
                Wait 5 Seconds:
                  Type: Wait
                  Seconds: 5
                  Next: TimeInvalidatorCrank
                TimeInvalidatorCrank:
                  Type: Task
                  Resource: arn:aws:states:::lambda:invoke
                  Parameters:
                    FunctionName: !GetAtt time-invalidator-crank.Arn
                    InvocationType: Event
                  End: true
            End: true

plugins:
  - serverless-plugin-typescript
  - serverless-plugin-include-dependencies
  - serverless-step-functions
  - serverless-offline
