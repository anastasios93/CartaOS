import { router } from "../trpc";
import { dealRouter } from "./deal";
import { companyRouter } from "./company";
import { negotiationRouter } from "./negotiation";
import { aiRouter } from "./ai";
import { searchRouter } from "./search";
import { documentRouter } from "./document";

export const appRouter = router({
  deal: dealRouter,
  company: companyRouter,
  negotiation: negotiationRouter,
  ai: aiRouter,
  search: searchRouter,
  document: documentRouter,
});

export type AppRouter = typeof appRouter;
