import { create } from "zustand";
import type { BoardColumn } from "@/entities/column/model/types";
import type { BoardTask } from "@/entities/task/model/types";

type MoveTaskInput = {
  taskId: string;
  fromColumnId: string;
  toColumnId: string;
  toIndex: number;
};

type ColumnsStore = {
  columns: BoardColumn[];
  setColumns: (columns: BoardColumn[]) => void;
  upsertColumn: (column: BoardColumn) => void;
  removeColumn: (columnId: string) => void;
  moveColumn: (input: { fromColumnId: string; toColumnId: string }) => void;
  upsertTask: (task: BoardTask) => void;
  removeTask: (taskId: string) => void;
  moveTask: (input: MoveTaskInput) => void;
};

function normalizeColumns(columns: BoardColumn[]) {
  return columns
    .map((column) => ({
      ...column,
      tasks: [...column.tasks].sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.order - b.order);
}

export const useColumnsStore = create<ColumnsStore>((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns: normalizeColumns(columns) }),
  upsertColumn: (column) =>
    set((state) => {
      const exists = state.columns.some((item) => item.id === column.id);
      const nextColumns = exists
        ? state.columns.map((item) =>
            item.id === column.id ? { ...item, ...column } : item,
          )
        : [...state.columns, column];

      return {
        columns: normalizeColumns(nextColumns),
      };
    }),
  removeColumn: (columnId) =>
    set((state) => ({
      columns: state.columns.filter((column) => column.id !== columnId),
    })),
  moveColumn: ({ fromColumnId, toColumnId }) =>
    set((state) => {
      const fromIndex = state.columns.findIndex(
        (column) => column.id === fromColumnId,
      );
      const toIndex = state.columns.findIndex(
        (column) => column.id === toColumnId,
      );

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return state;
      }

      const nextColumns = [...state.columns];
      const [moved] = nextColumns.splice(fromIndex, 1);

      if (!moved) {
        return state;
      }

      nextColumns.splice(toIndex, 0, moved);

      return {
        columns: nextColumns.map((column, index) => ({
          ...column,
          order: index,
        })),
      };
    }),
  upsertTask: (task) =>
    set((state) => {
      const cleaned = state.columns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((item) => item.id !== task.id),
      }));

      const withTask = cleaned.map((column) => {
        if (column.id !== task.columnId) {
          return column;
        }

        return {
          ...column,
          tasks: [...column.tasks, task],
        };
      });

      const normalized = withTask.map((column) => ({
        ...column,
        tasks: column.tasks.map((item, index) => ({ ...item, order: index })),
      }));

      return {
        columns: normalized,
      };
    }),
  removeTask: (taskId) =>
    set((state) => ({
      columns: state.columns.map((column) => ({
        ...column,
        tasks: column.tasks
          .filter((task) => task.id !== taskId)
          .map((task, index) => ({ ...task, order: index })),
      })),
    })),
  moveTask: ({ taskId, fromColumnId, toColumnId, toIndex }) =>
    set((state) => {
      const source = state.columns.find((column) => column.id === fromColumnId);
      const target = state.columns.find((column) => column.id === toColumnId);

      if (!source || !target) {
        return state;
      }

      const movingTask = source.tasks.find((task) => task.id === taskId);
      if (!movingTask) {
        return state;
      }

      const nextSourceTasks = source.tasks.filter((task) => task.id !== taskId);
      const nextTargetTasks =
        fromColumnId === toColumnId
          ? nextSourceTasks
          : [...target.tasks.filter((task) => task.id !== taskId)];

      const boundedIndex = Math.max(
        0,
        Math.min(toIndex, nextTargetTasks.length),
      );
      nextTargetTasks.splice(boundedIndex, 0, {
        ...movingTask,
        columnId: toColumnId,
      });

      const columns = state.columns.map((column) => {
        if (column.id === fromColumnId && fromColumnId !== toColumnId) {
          return {
            ...column,
            tasks: nextSourceTasks.map((task, index) => ({
              ...task,
              order: index,
            })),
          };
        }

        if (column.id === toColumnId) {
          return {
            ...column,
            tasks: nextTargetTasks.map((task, index) => ({
              ...task,
              order: index,
            })),
          };
        }

        return column;
      });

      return { columns };
    }),
}));
