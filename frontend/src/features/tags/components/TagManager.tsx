import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, PencilIcon, TrashIcon, TagIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "../api/tags";
import type { Tag } from "../api/tags";
import { tagSchema } from "../schemas/tag";
import type { TagFormData } from "../schemas/tag";

const COLOR_OPTIONS = [
  { name: "Blue", value: "blue", bg: "bg-blue-500", text: "text-white" },
  { name: "Green", value: "green", bg: "bg-green-500", text: "text-white" },
  { name: "Red", value: "red", bg: "bg-red-500", text: "text-white" },
  { name: "Purple", value: "purple", bg: "bg-purple-500", text: "text-white" },
  { name: "Yellow", value: "yellow", bg: "bg-yellow-500", text: "text-black" },
  { name: "Indigo", value: "indigo", bg: "bg-indigo-500", text: "text-white" },
  { name: "Pink", value: "pink", bg: "bg-pink-500", text: "text-white" },
  { name: "Slate", value: "slate", bg: "bg-slate-500", text: "text-white" },
  { name: "Amber", value: "amber", bg: "bg-amber-500", text: "text-black" },
];

export function getTagColorClass(colorVal: string | null): string {
  const match = COLOR_OPTIONS.find((c) => c.value === colorVal);
  return match ? `${match.bg} ${match.text}` : "bg-gray-200 text-gray-800";
}

interface TagManagerProps {
  trigger?: React.ReactNode;
}

export function TagManager({ trigger }: TagManagerProps) {
  const [open, setOpen] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<Tag | null>(null);
  const [selectedColor, setSelectedColor] = React.useState<string>("");

  const { data: tags = [], isLoading } = useTags();
  const createTagMutation = useCreateTag();
  const updateTagMutation = useUpdateTag();
  const deleteTagMutation = useDeleteTag();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: "",
      color: "",
    },
  });

  // Handle edit initiation
  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setValue("name", tag.name);
    setValue("color", tag.color || "");
    setSelectedColor(tag.color || "");
  };

  // Reset form
  const cancelEdit = () => {
    setEditingTag(null);
    setSelectedColor("");
    reset({ name: "", color: "" });
  };

  // Handle color selection
  const selectColor = (color: string) => {
    const val = selectedColor === color ? "" : color; // toggle
    setSelectedColor(val);
    setValue("color", val);
  };

  const onSubmit = async (data: TagFormData) => {
    if (editingTag) {
      await updateTagMutation.mutateAsync({
        id: editingTag.id,
        data: {
          name: data.name,
          color: selectedColor || undefined,
        },
      });
    } else {
      await createTagMutation.mutateAsync({
        name: data.name,
        color: selectedColor || undefined,
      });
    }
    cancelEdit();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this tag? This will detach it from all todos.")) {
      await deleteTagMutation.mutateAsync(id);
      if (editingTag?.id === id) {
        cancelEdit();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <TagIcon className="h-4 w-4" />
            Manage Tags
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Create, edit, or delete tags to organize your todos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">
              {editingTag ? "Edit Tag Name" : "Create New Tag"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="tag-name"
                placeholder="e.g. Work, Urgent, Personal"
                {...register("name")}
              />
              <Button
                type="submit"
                disabled={createTagMutation.isPending || updateTagMutation.isPending}
              >
                {editingTag ? "Save" : <PlusIcon className="h-4 w-4" />}
              </Button>
              {editingTag && (
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Color Selection Grid */}
          <div className="space-y-2">
            <Label>Select Color</Label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => selectColor(c.value)}
                  className={`h-8 rounded-md border flex items-center justify-center text-xs font-semibold cursor-pointer transition-all ${c.bg} ${c.text} ${
                    selectedColor === c.value
                      ? "ring-2 ring-ring ring-offset-2 scale-105"
                      : "opacity-80 hover:opacity-100"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </form>

        <Separator className="my-2" />

        {/* Existing Tags List */}
        <div className="space-y-2">
          <Label>Existing Tags</Label>
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Loading tags...
            </div>
          ) : tags.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No tags created yet.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-2 rounded-md border bg-card text-card-foreground"
                >
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getTagColorClass(
                      tag.color
                    )}`}
                  >
                    {tag.name}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => startEdit(tag)}
                    >
                      <PencilIcon className="h-3 w-3" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(tag.id)}
                    >
                      <TrashIcon className="h-3 w-3" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
