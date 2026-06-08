import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_redis
from app.core.redis import RedisClient
from app.db.session import get_db
from app.models.user import User
from app.schemas.todo import TodoCreate, TodoListResponse, TodoResponse, TodoUpdate, BulkStatusRequest
from app.schemas.tag import AttachTagRequest
from app.services.tag_service import get_tag_by_id as get_tag_by_id_service, attach_tag, detach_tag
from app.services.todo_service import (
    create_todo,
    delete_todo,
    get_todo_by_id,
    get_todos,
    update_todo,
    bulk_update_status,
)

router = APIRouter()

CACHE_TTL = 300  # 5 minutes


@router.get("", response_model=TodoListResponse)
async def list_todos(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None, regex="^(completed|active)$"),
    tag_id: uuid.UUID | None = Query(None),
    keyword: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Get paginated list of todos for the current user.

    BUG-02 FIX: Cache key now includes user_id, page, and size to prevent
    cross-user data leakage. Previously "todos:list" was shared across all users.

    BUG-10 FIX: Removed N+1 query pattern. Previously each todo triggered an
    extra SELECT to fetch the user's email. Now todos are fetched without the
    user join since user_email is redundant (the user already knows their email).
    """
    skip = (page - 1) * size

    # Scope cache by user_id, page, size, and all filter parameters
    cache_key = f"todos:list:{current_user.id}:{page}:{size}:{status}:{tag_id}:{keyword}:{date_from}:{date_to}"

    # Try to get from cache
    import json
    cached = await redis.get(cache_key)
    if cached:
        cached_data = json.loads(cached)
        return TodoListResponse(**cached_data)

    todos, total = await get_todos(
        db,
        user_id=current_user.id,
        status=status,
        tag_id=tag_id,
        keyword=keyword,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=size,
    )

    items = [
        TodoResponse(
            id=todo.id,
            title=todo.title,
            description=todo.description,
            completed=todo.completed,
            user_id=todo.user_id,
            created_at=todo.created_at,
            updated_at=todo.updated_at,
            tags=todo.tags,
        )
        for todo in todos
    ]

    response = TodoListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )

    # Cache the response
    await redis.set(cache_key, response.model_dump_json(), ex=CACHE_TTL)

    return response


@router.post("", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
async def create_new_todo(
    todo_data: TodoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Create a new todo item.

    BUG-06 FIX: Invalidate the user's cached todo list after creating a new todo.
    Previously the cache was never invalidated on create, so stale data was served.
    """
    todo = await create_todo(db, todo_data, current_user.id)

    # BUG-06 FIX: Invalidate user's cache entries
    await redis.delete_pattern(f"todos:list:{current_user.id}:*")

    return TodoResponse(
        id=todo.id,
        title=todo.title,
        description=todo.description,
        completed=todo.completed,
        user_id=todo.user_id,
        created_at=todo.created_at,
        updated_at=todo.updated_at,
        tags=todo.tags,
    )


@router.patch("/bulk-status", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_update_todos_status(
    payload: BulkStatusRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Bulk update completed status for todos owned by the user.

    Runs in a database transaction. Invalidates user's cache.
    """
    if not payload.todo_ids:
        return None

    # Verify that ALL requested todo_ids belong to the user
    from sqlalchemy import select, func
    from app.models.todo import Todo
    query = select(func.count(Todo.id)).where(Todo.id.in_(payload.todo_ids), Todo.user_id == current_user.id)
    res = await db.execute(query)
    count = res.scalar_one()
    if count != len(set(payload.todo_ids)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more todos not found",
        )

    await bulk_update_status(
        db,
        user_id=current_user.id,
        todo_ids=payload.todo_ids,
        completed=payload.completed,
    )
    await db.commit()

    # Invalidate cache
    await redis.delete_pattern(f"todos:list:{current_user.id}:*")
    return None


@router.get("/{todo_id}", response_model=TodoResponse)
async def get_todo(
    todo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific todo by ID.

    BUG-03 FIX: Authorization check ensures the todo belongs to the requesting user.
    Previously any authenticated user could read any todo by guessing its UUID.
    Return 404 (not 403) to avoid leaking the existence of other users' todos.
    """
    todo = await get_todo_by_id(db, todo_id)

    # BUG-03 FIX: Check ownership — return 404 to avoid leaking record existence
    if not todo or todo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found",
        )

    return todo


@router.put("/{todo_id}", response_model=TodoResponse)
async def update_existing_todo(
    todo_id: uuid.UUID,
    todo_data: TodoUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Update a todo item.

    BUG-03 FIX: Added ownership check — only the todo owner can update it.
    BUG-04 FIX: completed=False now properly uncompletes a todo. Previously
    the condition `if todo_data.completed:` silently skipped False values.
    BUG-05 FIX: Cleaned up the update logic to build update_data properly
    and pass it to the service instead of calling the service with {}.
    BUG-06 FIX: Cache is invalidated after successful update.
    """
    todo = await get_todo_by_id(db, todo_id)

    # BUG-03 FIX: Check ownership
    if not todo or todo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found",
        )

    # BUG-04 & BUG-05 FIX: Build update_data correctly and use `is not None`
    # so that completed=False is properly applied
    update_data = {}
    if todo_data.title is not None:
        update_data["title"] = todo_data.title
    if "description" in todo_data.model_fields_set:
        update_data["description"] = todo_data.description
    if todo_data.completed is not None:  # BUG-04 FIX: was `if todo_data.completed:`
        update_data["completed"] = todo_data.completed

    updated_todo = await update_todo(db, todo, update_data)

    # BUG-06 FIX: Invalidate user's cache
    await redis.delete_pattern(f"todos:list:{current_user.id}:*")

    return updated_todo


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_todo(
    todo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Delete a todo item.

    BUG-03 FIX: Added ownership check — only the todo owner can delete it.
    BUG-06 FIX: Cache is invalidated after deletion.
    """
    todo = await get_todo_by_id(db, todo_id)

    # BUG-03 FIX: Check ownership
    if not todo or todo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found",
        )

    await delete_todo(db, todo)

    # BUG-06 FIX: Invalidate user's cache
    await redis.delete_pattern(f"todos:list:{current_user.id}:*")

    return None


@router.post("/{todo_id}/tags", response_model=TodoResponse)
async def attach_tag_to_todo(
    todo_id: uuid.UUID,
    payload: AttachTagRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Attach a tag to a todo item."""
    todo = await get_todo_by_id(db, todo_id)
    if not todo or todo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found",
        )

    tag = await get_tag_by_id_service(db, payload.tag_id, current_user.id)
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )

    await attach_tag(db, todo, tag)
    await db.commit()

    # Invalidate cache
    await redis.delete_pattern(f"todos:list:{current_user.id}:*")

    await db.refresh(todo)
    return todo


@router.delete("/{todo_id}/tags/{tag_id}", response_model=TodoResponse)
async def detach_tag_from_todo(
    todo_id: uuid.UUID,
    tag_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Detach a tag from a todo item."""
    todo = await get_todo_by_id(db, todo_id)
    if not todo or todo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found",
        )

    tag = await get_tag_by_id_service(db, tag_id, current_user.id)
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )

    await detach_tag(db, todo, tag)
    await db.commit()

    # Invalidate cache
    await redis.delete_pattern(f"todos:list:{current_user.id}:*")

    await db.refresh(todo)
    return todo

