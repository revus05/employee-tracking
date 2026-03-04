import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(3, "Название должно быть не короче 3 символов").max(80),
  description: z.string().max(400).optional().or(z.literal("")),
});

export const createInvitationSchema = z.object({
  inviteeId: z.string().min(1, "Выберите пользователя"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
