import { z } from "zod";
export const fileSignalSchema = z.object({
  type: z.literal("file-signal"),
  session: z.string().max(100),
  to: z.string().max(100),
  fileId: z.string().uuid(),
  signal: z.discriminatedUnion("type", [
    z.object({ type: z.literal("offer"), sdp: z.string().min(1).max(3000) }),
    z.object({ type: z.literal("answer"), sdp: z.string().min(1).max(3000) }),
    z.object({
      type: z.literal("ice"),
      candidate: z.string().max(1000),
      sdpMid: z.string().max(100).nullable(),
      sdpMLineIndex: z.number().int().min(0).max(32).nullable(),
    }),
    z.object({ type: z.literal("relay-request") }),
    z.object({
      type: z.literal("relay-ack"),
      offset: z
        .number()
        .int()
        .min(0)
        .max(25 * 1024 * 1024),
    }),
    z.object({ type: z.literal("unavailable") }),
  ]),
});
export type FileSignal = z.infer<typeof fileSignalSchema>;
