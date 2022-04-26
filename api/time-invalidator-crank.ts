import { invalidateAll } from "./time-invalidate-crank/invalidate";

invalidateAll().catch((e) => console.log(e));
