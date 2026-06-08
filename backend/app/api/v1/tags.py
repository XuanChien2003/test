import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_redis
from app.core.redis import RedisClient
from app.db.session import get_db
from app.models.user import User
from app.schemas.tag import TagCreate, TagResponse, TagUpdate
from app.services.tag_service import (
    create_tag,
    delete_tag,
    get_tag_by_id,
    get_tags,
    update_tag,
)

router = APIRouter()


@router.get("", response_model=list[TagResponse])
async def list_user_tags(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all tags of the authenticated user."""
    tags = await get_tags(db, current_user.id)
    return tags


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_new_tag(
    tag_data: TagCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Create a new tag. Check case-insensitive uniqueness and invalidate cache."""
    try:
        tag = await create_tag(db, current_user.id, tag_data)
        # Invalidate the user's todo list cache (in case they query tags list)
        await redis.delete_pattern(f"todos:list:{current_user.id}:*")
        return tag
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch("/{tag_id}", response_model=TagResponse)
async def update_existing_tag(
    tag_id: uuid.UUID,
    tag_data: TagUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Update tag name/color. Check case-insensitive uniqueness and invalidate cache."""
    tag = await get_tag_by_id(db, tag_id, current_user.id)
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )

    try:
        updated_tag = await update_tag(db, tag, tag_data.model_dump(exclude_unset=True))
        # Invalidate the user's todo list cache since tag details might be cached
        await redis.delete_pattern(f"todos:list:{current_user.id}:*")
        return updated_tag
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_tag(
    tag_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Delete a tag and detach it from all todos."""
    tag = await get_tag_by_id(db, tag_id, current_user.id)
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )

    await delete_tag(db, tag)
    # Invalidate the user's todo list cache
    await redis.delete_pattern(f"todos:list:{current_user.id}:*")
    return None
