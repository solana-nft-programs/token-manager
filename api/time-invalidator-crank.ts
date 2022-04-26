import { invalidateAll } from "./time-invalidator-crank/invalidate";

invalidateAll().catch((e) => console.log(e));
