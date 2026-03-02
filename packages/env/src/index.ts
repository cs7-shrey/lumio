import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";


export const env = createEnv({
  server: {
    OPENROUTER_API_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
