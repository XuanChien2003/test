import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, XIcon } from "lucide-react";
import type { Todo } from "../api/todos";
import { useTags } from "../../tags/api/tags";
import { getTagColorClass } from "../../tags/components/TagManager";

interface TodoItemProps {
  todo: Todo;
  index: number;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelectToggle: (id: string) => void;
  onAttachTag: (todoId: string, tagId: string) => void;
  onDetachTag: (todoId: string, tagId: string) => void;
}

export function TodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete,
  isSelected,
  onSelectToggle,
  onAttachTag,
  onDetachTag,
}: TodoItemProps) {
  const { data: tags = [] } = useTags();

  // Find tags that are NOT already attached to this todo
  const attachedIds = new Set(todo.tags?.map((t) => t.id) || []);
  const availableTags = tags.filter((t) => !attachedIds.has(t.id));

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
      {/* Selection checkbox for bulk status update */}
      <Checkbox
        id={`select-${todo.id}`}
        checked={isSelected}
        onCheckedChange={() => onSelectToggle(todo.id)}
        className="border-muted-foreground/50"
      />

      {/* Completion toggle checkbox */}
      <Checkbox
        id={`todo-${todo.id}`}
        checked={todo.completed}
        onCheckedChange={() => onToggle(todo)}
      />

      <div className="flex-1 min-w-0">
        <label
          htmlFor={`todo-${todo.id}`}
          className={`text-sm font-medium cursor-pointer break-words block ${
            todo.completed ? "line-through text-muted-foreground" : ""
          }`}
        >
          {todo.title}
        </label>
        {todo.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {todo.description}
          </p>
        )}

        {/* Tags badges */}
        <div className="flex flex-wrap items-center gap-1 mt-2">
          {todo.tags?.map((tag) => (
            <span
              key={tag.id}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-2xs ${getTagColorClass(
                tag.color
              )}`}
            >
              {tag.name}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onDetachTag(todo.id, tag.id);
                }}
                className="opacity-70 hover:opacity-100 cursor-pointer ml-0.5"
              >
                <XIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}

          {/* Plus icon select to attach tags */}
          {availableTags.length > 0 && (
            <div className="relative inline-block">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    onAttachTag(todo.id, e.target.value);
                  }
                }}
                className="h-5 rounded-full border border-dashed border-muted-foreground/40 px-1.5 py-0 text-[10px] bg-transparent text-muted-foreground hover:text-foreground cursor-pointer focus:outline-hidden hover:border-muted-foreground/80 transition-colors"
              >
                <option value="" disabled>
                  + Add Tag
                </option>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(todo)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(todo.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
