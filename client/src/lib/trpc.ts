import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers.type";

export const trpc = createTRPCReact<AppRouter>();
