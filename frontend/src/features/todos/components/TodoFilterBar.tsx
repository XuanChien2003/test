import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTags } from "../../tags/api/tags";
import type { TodoFilters } from "../api/todos";

interface TodoFilterBarProps {
  filters: TodoFilters;
  onChange: (filters: TodoFilters) => void;
  onClear: () => void;
}

export function TodoFilterBar({ filters, onChange, onClear }: TodoFilterBarProps) {
  const { data: tags = [] } = useTags();

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, keyword: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, status: e.target.value || undefined });
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, tag_id: e.target.value || undefined });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, date_from: e.target.value || undefined });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, date_to: e.target.value || undefined });
  };

  const hasActiveFilters = Object.values(filters).some((val) => val !== undefined && val !== "");

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4 shadow-xs">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Search */}
        <div className="md:col-span-4 space-y-1">
          <Label htmlFor="search-todo" className="text-xs font-semibold text-muted-foreground">Search</Label>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-todo"
              type="text"
              placeholder="Search title or description..."
              value={filters.keyword || ""}
              onChange={handleKeywordChange}
              className="pl-8"
            />
          </div>
        </div>

        {/* Status */}
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="filter-status" className="text-xs font-semibold text-muted-foreground">Status</Label>
          <select
            id="filter-status"
            value={filters.status || ""}
            onChange={handleStatusChange}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Tag */}
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="filter-tag" className="text-xs font-semibold text-muted-foreground">Tag</Label>
          <select
            id="filter-tag"
            value={filters.tag_id || ""}
            onChange={handleTagChange}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          >
            <option value="">All Tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="filter-date-from" className="text-xs font-semibold text-muted-foreground">From Date</Label>
          <Input
            id="filter-date-from"
            type="date"
            value={filters.date_from || ""}
            onChange={handleDateFromChange}
            className="w-full text-xs"
          />
        </div>

        {/* Date To */}
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="filter-date-to" className="text-xs font-semibold text-muted-foreground">To Date</Label>
          <Input
            id="filter-date-to"
            type="date"
            value={filters.date_to || ""}
            onChange={handleDateToChange}
            className="w-full text-xs"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <XIcon className="h-3.5 w-3.5" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
