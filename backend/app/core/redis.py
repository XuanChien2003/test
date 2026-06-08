import redis.asyncio as aioredis

from app.core.config import settings


class RedisClient:
    def __init__(self):
        self._redis = None

    async def initialize(self):
        self._redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )

    async def close(self):
        if self._redis:
            await self._redis.close()

    @property
    def client(self):
        return self._redis

    async def get(self, key: str) -> str | None:
        return await self._redis.get(key)

    async def set(self, key: str, value: str, ex: int | None = None):
        await self._redis.set(key, value, ex=ex)

    async def delete(self, key: str):
        await self._redis.delete(key)

    async def exists(self, key: str) -> bool:
        return await self._redis.exists(key)

    async def delete_pattern(self, pattern: str) -> None:
        """Delete all keys matching a glob pattern using SCAN (safe for production).

        BUG-06 FIX support: Needed to invalidate all user-scoped cache pages
        without knowing the exact page/size combinations.
        Uses SCAN instead of KEYS to avoid blocking the Redis server.
        """
        cursor = 0
        while True:
            cursor, keys = await self._redis.scan(cursor, match=pattern, count=100)
            if keys:
                await self._redis.delete(*keys)
            if cursor == 0:
                break


redis_client = RedisClient()
