import { router } from "../trpc";
import { dealRouter } from "./deal";
import { companyRouter } from "./company";
import { negotiationRouter } from "./negotiation";
import { aiRouter } from "./ai";
import { searchRouter } from "./search";
import { documentRouter } from "./document";
import { userRouter } from "./user";
import { adminRouter } from "./admin";
import { hubRouter } from "./hub";
import { runRouter } from "./run";

export const appRouter = router({
  deal: dealRouter,
  company: companyRouter,
  negotiation: negotiationRouter,
  ai: aiRouter,
  search: searchRouter,
  document: documentRouter,
  user: userRouter,
  admin: adminRouter,
  hub: hubRouter,
  run: runRouter,
});

export type AppRouter = typeof appRouter;
