org: jpbogle
app: cardinal
service: cardinal-token-manager
frameworkVersion: "2 || 3"

provider:
  name: aws
  runtime: nodejs14.x
  lambdaHashingVersion: "20201221"

package:
  individually: true
  exclude:
    - "./node_modules"
    - "./package-lock.json"
    - "./yarn.lock"

functions:
  relister:
    timeout: 30
    handler: relister/handler.relist
    environment:
      EMPIRE_DAO_KEY: ${ssm:/EMPIRE_DAO_KEY~true}
      RELISTING_DISABLED: ${param:RELISTING_DISABLED,false}
    events:
      - schedule: rate(1 minute)
  time-invalidator-crank:
    timeout: 30
    environment:
      SOLANA_CRANK_KEY: ${ssm:/SOLANA_CRANK_KEY~true}
      CRANK_DISABLED: ${param:CRANK_DISABLED,false}
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
