import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import Tag
from app.models.todo import Todo
from app.schemas.tag import TagCreate


async def get_tags(db: AsyncSession, user_id: uuid.UUID) -> list[Tag]:
    """Get all tags of a specific user."""
    query = select(Tag).where(Tag.user_id == user_id).order_by(Tag.name)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_tag_by_id(db: AsyncSession, tag_id: uuid.UUID, user_id: uuid.UUID) -> Tag | None:
    """Get a specific tag by ID and check user ownership."""
    query = select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_tag(db: AsyncSession, user_id: uuid.UUID, tag_data: TagCreate) -> Tag:
    """Create a tag for a user with case-insensitive uniqueness check."""
    # Check duplicate
    query = select(Tag).where(
        Tag.user_id == user_id,
        func.lower(Tag.name) == func.lower(tag_data.name)
    )
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise ValueError("Tag name must be unique per user")

    tag = Tag(
        user_id=user_id,
        name=tag_data.name,
        color=tag_data.color,
    )
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return tag


async def update_tag(db: AsyncSession, tag: Tag, tag_update_data: dict) -> Tag:
    """Update a tag checking for case-insensitive duplicate names if name is changed."""
    new_name = tag_update_data.get("name")
    if new_name is not None and new_name != tag.name:
        query = select(Tag).where(
            Tag.user_id == tag.user_id,
            Tag.id != tag.id,
            func.lower(Tag.name) == func.lower(new_name)
        )
        result = await db.execute(query)
        if result.scalar_one_or_none():
            raise ValueError("Tag name must be unique per user")

    for key, value in tag_update_data.items():
        if value is not None:
            setattr(tag, key, value)

    await db.flush()
    await db.refresh(tag)
    return tag


async def delete_tag(db: AsyncSession, tag: Tag) -> None:
    """Delete a tag (related todo_tags records will cascade delete via DB constraints)."""
    await db.delete(tag)
    await db.flush()


async def attach_tag(db: AsyncSession, todo: Todo, tag: Tag) -> None:
    """Attach a tag to a todo."""
    # Ensure they are not already associated
    if tag not in todo.tags:
        todo.tags.append(tag)
        await db.flush()


async def detach_tag(db: AsyncSession, todo: Todo, tag: Tag) -> None:
    """Detach a tag from a todo."""
    if tag in todo.tags:
        todo.tags.remove(tag)
        await db.flush()
