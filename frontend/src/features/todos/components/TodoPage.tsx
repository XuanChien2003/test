import { useState, useEffect } from "react";
import { Plus, LogOut, CheckSquare, Square, CheckCircle2, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTodos } from "../api/todos";
import type { TodoFilters } from "../api/todos";
import { TodoList } from "./TodoList";
import { TodoForm } from "./TodoForm";
import { TodoFilterBar } from "./TodoFilterBar";
import { TagManager } from "@/features/tags/components/TagManager";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAttachTag, useDetachTag, useBulkUpdateTodos } from "@/features/tags/api/tags";

const PAGE_SIZE = 20;

export function TodoPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TodoFilters>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading, error } = useTodos(page, PAGE_SIZE, filters);
  const { user, logout } = useAuth();

  const attachTagMutation = useAttachTag();
  const detachTagMutation = useDetachTag();
  const bulkUpdateMutation = useBulkUpdateTodos();

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [filters]);

  // Reset selectedIds when data items change (e.g. pagination or delete)
  useEffect(() => {
    setSelectedIds([]);
  }, [data]);

  const handleFilterChange = (newFilters: TodoFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (!data) return;
    const allIds = data.items.map((todo) => todo.id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]); // deselect all
    } else {
      setSelectedIds(allIds); // select all
    }
  };

  const handleBulkStatusChange = async (completed: boolean) => {
    if (selectedIds.length === 0) return;
    await bulkUpdateMutation.mutateAsync({
      todoIds: selectedIds,
      completed,
    });
    setSelectedIds([]);
  };

  const handleAttachTag = (todoId: string, tagId: string) => {
    attachTagMutation.mutate({ todoId, tagId });
  };

  const handleDetachTag = (todoId: string, tagId: string) => {
    detachTagMutation.mutate({ todoId, tagId });
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="min-h-screen bg-muted/40 pb-12">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-40 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Todo Dashboard</h1>
            {user && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TagManager />
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Filters */}
        <TodoFilterBar
          filters={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />

        {/* Bulk Actions Banner */}
        {data && data.items.length > 0 && (
          <div className="bg-card border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs h-8 px-2 gap-1.5"
              >
                {selectedIds.length === data.items.length ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Select All ({selectedIds.length}/{data.items.length})
              </Button>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">Bulk actions:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusChange(true)}
                  className="text-xs h-8 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                  disabled={bulkUpdateMutation.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark Completed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusChange(false)}
                  className="text-xs h-8 gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  disabled={bulkUpdateMutation.isPending}
                >
                  <Circle className="h-3.5 w-3.5" />
                  Mark Active
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedIds([])}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Todos Card */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-bold">My Todos</CardTitle>
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Todo
            </Button>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-4">
            {isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                Loading todos...
              </div>
            )}

            {error && (
              <div className="text-center py-12 text-destructive">
                Failed to load todos. Please try again.
              </div>
            )}

            {data && (
              <TodoList
                todos={data.items}
                selectedIds={selectedIds}
                onSelectToggle={handleSelectToggle}
                onAttachTag={handleAttachTag}
                onDetachTag={handleDetachTag}
              />
            )}

            {/* Pagination Controls */}
            {data && totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}

            {data && data.total > 0 && (
              <div className="text-center text-xs text-muted-foreground pt-2">
                Showing {data.items.length} of {data.total} todos
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create Todo Dialog */}
      <TodoForm
        mode="create"
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
      />
    </div>
  );
}
