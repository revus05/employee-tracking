import type { BoardTask } from "@/entities/task/model/types";

export type BoardColumn = {
  id: string;
  name: string;
  color: string;
  order: number;
  tasks: BoardTask[];
};
