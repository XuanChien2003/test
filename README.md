# Developer Assessment: Code Review & Bug Hunting

## Overview

This is a full-stack Todo application with JWT authentication.

The codebase contains intentional issues across backend, frontend, database, caching, and infrastructure layers. The assessment is designed to evaluate practical debugging, code review judgment, and the ability to propose or implement safe fixes.

## Required Task: Bug Hunting & Fixes

Review the codebase and identify the most important issues you can find.

_Note: You can report not only functional bugs, but also any architectural, performance, or design issues you find unreasonable. Reviewers will evaluate your assessment based on the issues you identify and your proposed improvements._

For each reported issue, include:

- **Location**: file path and relevant function/line.
- **Reason**: why do you think it is an issue.
- **Fix proposal**: concise explanation or code snippet.

Then implement fixes for the issues you consider most important.
You do not need to fix every issue you report. Fixing bugs related to convention is not too important.
Prioritize correctness, security, data isolation, and regressions over cosmetic cleanup.

Expected implementation scope:

- Fix at least **5 meaningful issues**, including at least **2 backend issues** and **1 frontend issue**.
- Add or update tests for the fixes where practical.
- Keep changes focused and explain any important tradeoffs.

## Areas To Investigate

- Security and authentication: JWT validation, authorization, data isolation.
- Backend API correctness: REST semantics, validation, business logic.
- Database and performance: schema constraints, query efficiency, migrations.
- Caching: cache key isolation and invalidation.
- Frontend state management: React Query keys, optimistic updates, auth state, UX behavior.
- Infrastructure: Docker setup, environment configuration, test reliability.

## Deliverables

> [!IMPORTANT]
> **Submission Workflow:**
>
> 1. **Fork** this repository.
> 2. Work only in your fork. Do not create branches, issues, pull requests, or other visible artifacts in the original repository.
> 3. Create a branch in your fork for your changes. Example: `bugfix/fix-auth-issues`, `assessment/bug-report`, etc.
> 4. Push the changes to your fork.
> 5. Create a **Pull Request (PR) inside your fork**, targeting the default branch of your fork. Do not open a PR against the original repository.
> 6. Submit the link to your fork PR. If your Git hosting provider does not support PRs within a fork, submit the fork repository link and branch name instead.
> 7. **Document all findings, explanations, and report details directly in the Pull Request description.** Reviewers will evaluate your work primarily based on the contents and clarity of this PR description.

Your Pull Request must contain:

- Your bug report (fully described in the PR description).
- Source code changes, migrations if needed, and tests for implemented fixes.
- Setup or verification notes, including commands you ran and any known limitations.

AI-assisted tools are allowed.
If you use them, disclose the type of assistance briefly in your report.

You should commit all resources and configurations related to the coding agents you used (such as `Claude.md`, `.agents`, `.claude`, `.cursor`, etc.) and any custom instructions or documentation you defined for the AI.

\(\*) Do not commit private credentials or editor-specific history files.

## Setup

Follow the instructions in [GUIDE.md](GUIDE.md) to run the application locally.

---

## Optional Extension: Todo Tags, Filtering & Bulk Actions

If you finish the required task and want to demonstrate broader full-stack implementation ability, implement the feature below. This is optional unless your interviewer explicitly asks for it.

### Database Schema

Create the following tables and relationships:

- **`tags`**
  - `id`: UUID primary key
  - `user_id`: UUID foreign key referencing `users(id)`, not null
  - `name`: VARCHAR(50), not null
  - `color`: VARCHAR(20), nullable
  - `created_at`: TIMESTAMPTZ, not null
  - `updated_at`: TIMESTAMPTZ, not null
- **`todo_tags`**
  - `todo_id`: UUID foreign key referencing `todos(id)`, not null
  - `tag_id`: UUID foreign key referencing `tags(id)`, not null
  - Primary key: `(todo_id, tag_id)`

Constraints and indexes:

- Case-insensitive unique tag names per user.
- Indexes on `tags(user_id)`, `todo_tags(tag_id)`, `todo_tags(todo_id)`, and `todos(user_id, completed, created_at)`.

### API Endpoints

- `GET /tags`: list all tags of the authenticated user.
- `POST /tags`: create a new tag.
- `PATCH /tags/{tag_id}`: rename/update a tag.
- `DELETE /tags/{tag_id}`: delete a tag and its todo-tag relations.
- `GET /todos?status=&tag_id=&keyword=&date_from=&date_to=&page=&page_size=`: list todos with filtering and pagination.
- `POST /todos/{todo_id}/tags`: attach a tag to a todo.
- `DELETE /todos/{todo_id}/tags/{tag_id}`: detach a tag from a todo.
- `PATCH /todos/bulk-status`: bulk update status.
  - Payload: `{ "todo_ids": ["uuid-1", "uuid-2"], "completed": true }`

### Backend Rules

- Users must only interact with their own tags and todos.
- Users can only attach their own tags to their own todos.
- Tag names must be unique per user, case-insensitively.
- Bulk updates must run in a database transaction.
- Todo pagination must order by `created_at DESC, id DESC`.
- Redis cache for todo lists must scope by user and query/filter parameters.
- Cache must be invalidated on create, update, delete, tag mapping, and bulk updates.

### Frontend Requirements

- Todo list filter bar with keyword, status, tag, date range, and clear filters.
- Todo item UI displaying attached tags.
- Tag management UI for list/create/rename/delete.
- Bulk actions for selecting multiple todos and marking them completed or active.
- Use `@tanstack/react-query` for data fetching and mutations.
- Query keys must include all filter parameters.
- Invalidate query cache correctly after mutations.
- Use `react-hook-form` and `zod` for validation matching the backend.
- Clear user-scoped cached data on logout.

### Suggested Tests

- Backend: create tag success, duplicate tag casing, cross-user access prevention, attaching another user's tag prevention, filtering by tag, bulk update ownership check, cache invalidation.
- Frontend: tag form validation, todo filter query key behavior, bulk action success/error handling, logout clearing cached data.
