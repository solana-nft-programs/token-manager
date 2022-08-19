import { invalidateAll } from "./time-invalidator-crank/invalidate";
import { invalidateAllParallel } from "./time-invalidator-crank/invalidate-parallel";

invalidateAllParallel().catch((e) => console.log(e));
