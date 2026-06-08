import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { Tag } from "../../tags/api/tags";

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface TodoListResponse {
  items: Todo[];
  total: number;
  page: number;
  size: number;
}

export interface CreateTodoRequest {
  title: string;
  description?: string;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface TodoFilters {
  status?: string;
  tag_id?: string;
  keyword?: string;
  date_from?: string;
  date_to?: string;
}

export function useTodos(page: number = 1, size: number = 20, filters: TodoFilters = {}) {
  return useQuery({
    queryKey: ["todos", page, size, filters],
    queryFn: async (): Promise<TodoListResponse> => {
      const response = await api.get("/todos", {
        params: {
          page,
          size,
          status: filters.status || undefined,
          tag_id: filters.tag_id || undefined,
          keyword: filters.keyword || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        },
      });
      return response.data;
    },
  });
}

export function useCreateTodo() {
  return useMutation({
    mutationFn: async (data: CreateTodoRequest): Promise<Todo> => {
      const response = await api.post("/todos", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Todo created successfully!");
    },
    onError: () => {
      toast.error("Failed to create todo");
    },
  });
}

export function useUpdateTodo() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTodoRequest;
    }): Promise<Todo> => {
      const response = await api.put(`/todos/${id}`, data);
      return response.data;
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["todos"] });

      // Find all queries matching ["todos"]
      const queries = queryClient.getQueryCache().findAll({ queryKey: ["todos"] });
      const previousQueries = queries.map((query) => ({
        queryKey: query.queryKey,
        data: query.state.data,
      }));

      // Optimistically update
      queries.forEach((query) => {
        const queryData = query.state.data as TodoListResponse | undefined;
        if (queryData) {
          queryClient.setQueryData<TodoListResponse>(query.queryKey, {
            ...queryData,
            items: queryData.items.map((todo) =>
              todo.id === id ? { ...todo, ...data } : todo
            ),
          });
        }
      });

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      const ctx = context as { previousQueries?: { queryKey: any; data: any }[] } | undefined;
      if (ctx?.previousQueries) {
        ctx.previousQueries.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error("Failed to update todo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

export function useDeleteTodo() {
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Todo deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete todo");
    },
  });
}

export function useToggleTodo() {
  const updateTodo = useUpdateTodo();

  return {
    ...updateTodo,
    mutate: (todo: Todo) => {
      updateTodo.mutate({
        id: todo.id,
        data: { completed: !todo.completed },
      });
    },
  };
}
