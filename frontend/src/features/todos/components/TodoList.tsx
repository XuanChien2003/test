import { useState } from "react";
import { TodoItem } from "./TodoItem";
import { TodoForm } from "./TodoForm";
import type { Todo } from "../api/todos";
import { useDeleteTodo, useToggleTodo } from "../api/todos";

interface TodoListProps {
  todos: Todo[];
  selectedIds: string[];
  onSelectToggle: (id: string) => void;
  onAttachTag: (todoId: string, tagId: string) => void;
  onDetachTag: (todoId: string, tagId: string) => void;
}

export function TodoList({
  todos,
  selectedIds,
  onSelectToggle,
  onAttachTag,
  onDetachTag,
}: TodoListProps) {
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const deleteTodo = useDeleteTodo();
  const toggleTodo = useToggleTodo();

  const handleToggle = (todo: Todo) => {
    toggleTodo.mutate(todo);
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this todo?")) {
      deleteTodo.mutate(id);
    }
  };

  if (todos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-card/20">
        <p className="text-lg font-medium">No todos found</p>
        <p className="text-sm mt-1">Try relaxing your filters or create a new todo</p>
      </div>
    );
  }

  const selectedSet = new Set(selectedIds);

  return (
    <>
      <div className="space-y-2">
        {todos.map((todo, index) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            index={index}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isSelected={selectedSet.has(todo.id)}
            onSelectToggle={onSelectToggle}
            onAttachTag={onAttachTag}
            onDetachTag={onDetachTag}
          />
        ))}
      </div>

      {editingTodo && (
        <TodoForm
          mode="edit"
          todo={editingTodo}
          open={!!editingTodo}
          onClose={() => setEditingTodo(null)}
        />
      )}
    </>
  );
}
