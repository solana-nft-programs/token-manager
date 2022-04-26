org: jpbogle
app: cardinal
service: cardinal-token-manager
frameworkVersion: "2 || 3"

provider:
  name: aws
  runtime: nodejs14.x
  lambdaHashingVersion: "20201221"

stepFunctions:
  stateMachines:
    everyminute:
      type: EXPRESS
      events:
        - schedule:
            rate: rate(1 minute)
      id: loop-${opt:stage}
      name: loop-${opt:stage}
      definition:
        StartAt: Create Loop Items
        States:
          Create Loop Items:
            Type: Pass
            Next: Loop
            Result:
              items: [1, 2, 3, 4, 5, 6]
          Loop:
            Type: Map
            ItemsPath: "$.items"
            MaxConcurrency: 1
            Iterator:
              StartAt: Wait 10 Seconds
              States:
                Wait 10 Seconds:
                  Type: Wait
                  Seconds: 10
                  Next: TimeInvalidatorCrank
                TimeInvalidatorCrank:
                  Type: Task
                  Resource: arn:aws:states:::lambda:invoke
                  Parameters:
                    FunctionName: !GetAtt time-invalidate-crank.Arn
                    InvocationType: Event
                  End: true
            End: true

plugins:
  - serverless-plugin-typescript
  - serverless-step-functions
