import { z } from "zod";
import { FEEDBACK_RESPONSES } from "../constants/status";
import { parentTokenSchema } from "./common.schema";

export const feedbackInputSchema = z.strictObject({
  token: parentTokenSchema,
  response: z.enum(FEEDBACK_RESPONSES),
  message: z.string().trim().max(500).optional(),
});

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
