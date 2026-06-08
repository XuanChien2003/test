import { z } from "zod";

export const tagSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(50, "Tag name must be 50 characters or less")
    .trim(),
  color: z
    .string()
    .max(20, "Color name must be 20 characters or less")
    .optional()
    .or(z.literal("")),
});

export type TagFormData = z.infer<typeof tagSchema>;
