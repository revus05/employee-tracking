export type TaskComment = {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
};

export type BoardTask = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  columnId: string;
  order: number;
  comments?: TaskComment[];
};
