import { z } from "zod";

export const createColumnSchema = z.object({
  name: z.string().min(2, "Название колонки слишком короткое").max(40),
  color: z
    .string()
    .regex(/^[a-z-]+$/, "Неверный цвет")
    .optional(),
});

export const updateColumnSchema = createColumnSchema
  .partial()
  .refine(
    (value) => value.name !== undefined || value.color !== undefined,
    "Нужно изменить хотя бы одно поле",
  );

export const reorderColumnsSchema = z.object({
  fromColumnId: z.string().min(1),
  toColumnId: z.string().min(1),
});

export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>;
