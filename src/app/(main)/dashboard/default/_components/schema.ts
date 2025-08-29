import { z } from "zod";

export const sectionSchema = z.object({
  id: z.union([z.number(), z.string()]),
  header: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  target: z.string().optional(),
  limit: z.string().optional(),
  reviewer: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  templateName: z.string().optional(),
  updatedAt: z.string().optional(),
});
