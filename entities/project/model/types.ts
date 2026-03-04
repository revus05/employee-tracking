import type { BoardColumn } from "@/entities/column/model/types";

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  membersCount: number;
};

export type ProjectBoard = {
  id: string;
  name: string;
  description: string | null;
  columns: BoardColumn[];
  members: Array<{
    id: string;
    username: string;
    email: string;
    role: "MANAGER" | "DEVELOPER";
  }>;
};
