import uuid

from datetime import datetime
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.todo import Todo
from app.models.tag import Tag
from app.schemas.todo import TodoCreate


async def create_todo(
    db: AsyncSession, todo_data: TodoCreate, user_id: uuid.UUID
) -> Todo:
    todo = Todo(
        title=todo_data.title,
        description=todo_data.description,
        user_id=user_id,
    )
    db.add(todo)
    await db.flush()
    await db.refresh(todo)
    return todo


async def get_todos(
    db: AsyncSession,
    user_id: uuid.UUID,
    status: str | None = None,
    tag_id: uuid.UUID | None = None,
    keyword: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Todo], int]:
    """Get todos with filtering, ordering (created_at DESC, id DESC), and pagination."""
    query = select(Todo).where(Todo.user_id == user_id)
    count_query = select(func.count(Todo.id)).select_from(Todo).where(Todo.user_id == user_id)

    # 1. Status filter
    if status == "completed":
        query = query.where(Todo.completed == True)
        count_query = count_query.where(Todo.completed == True)
    elif status == "active":
        query = query.where(Todo.completed == False)
        count_query = count_query.where(Todo.completed == False)

    # 2. Tag filter
    if tag_id is not None:
        query = query.join(Todo.tags).where(Tag.id == tag_id)
        count_query = count_query.join(Todo.tags).where(Tag.id == tag_id)

    # 3. Keyword search (case-insensitive title or description)
    if keyword:
        keyword_pattern = f"%{keyword}%"
        query = query.where(Todo.title.ilike(keyword_pattern) | Todo.description.ilike(keyword_pattern))
        count_query = count_query.where(Todo.title.ilike(keyword_pattern) | Todo.description.ilike(keyword_pattern))

    # 4. Date range filters
    if date_from is not None:
        query = query.where(Todo.created_at >= date_from)
        count_query = count_query.where(Todo.created_at >= date_from)
    if date_to is not None:
        query = query.where(Todo.created_at <= date_to)
        count_query = count_query.where(Todo.created_at <= date_to)

    # 5. Order: created_at DESC, id DESC
    query = query.order_by(Todo.created_at.desc(), Todo.id.desc())

    # 6. Pagination
    query = query.offset(skip).limit(limit)

    # Execute
    result = await db.execute(query)
    todos = list(result.scalars().all())

    # Count total
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    return todos, total


async def get_todo_by_id(db: AsyncSession, todo_id: uuid.UUID) -> Todo | None:
    result = await db.execute(select(Todo).where(Todo.id == todo_id))
    return result.scalar_one_or_none()


async def update_todo(db: AsyncSession, todo: Todo, update_data: dict) -> Todo:
    for key, value in update_data.items():
        setattr(todo, key, value)
    await db.flush()
    await db.refresh(todo)
    return todo


async def delete_todo(db: AsyncSession, todo: Todo) -> None:
    await db.delete(todo)
    await db.flush()


async def bulk_update_status(
    db: AsyncSession,
    user_id: uuid.UUID,
    todo_ids: list[uuid.UUID],
    completed: bool,
) -> None:
    """Bulk update completed status for todos owned by the user. Run in transaction."""
    stmt = (
        update(Todo)
        .where(Todo.id.in_(todo_ids), Todo.user_id == user_id)
        .values(completed=completed, updated_at=datetime.utcnow())
    )
    await db.execute(stmt)
    await db.flush()

