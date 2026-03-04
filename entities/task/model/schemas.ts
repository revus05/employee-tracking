import { z } from "zod";

const optionalDate = z
  .string()
  .datetime({ offset: true })
  .or(z.literal(""))
  .optional();

export const createTaskSchema = z.object({
  title: z.string().min(2, "Название задачи слишком короткое").max(120),
  description: z.string().max(1200).optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
  deadline: optionalDate,
  columnId: z.string().min(1),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.assigneeId !== undefined ||
      value.deadline !== undefined ||
      value.columnId !== undefined,
    "Нужно изменить хотя бы одно поле",
  );

export const reorderTaskSchema = z.object({
  taskId: z.string().min(1),
  fromColumnId: z.string().min(1),
  toColumnId: z.string().min(1),
  toIndex: z.number().int().min(0),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ReorderTaskInput = z.infer<typeof reorderTaskSchema>;
