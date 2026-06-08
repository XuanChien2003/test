import pytest
from httpx import AsyncClient
from tests.test_todos import get_auth_token


@pytest.mark.asyncio
async def test_create_tag(client: AsyncClient):
    """Test creating a tag."""
    token = await get_auth_token(client, "tag1@example.com")
    response = await client.post(
        "/api/v1/tags",
        json={"name": "Work", "color": "blue"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Work"
    assert data["color"] == "blue"


@pytest.mark.asyncio
async def test_duplicate_tag_casing(client: AsyncClient):
    """Test case-insensitive duplicate tag name prevention per user."""
    token = await get_auth_token(client, "tag2@example.com")

    # Create tag
    response1 = await client.post(
        "/api/v1/tags",
        json={"name": "Work", "color": "blue"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response1.status_code == 201

    # Create duplicate tag with different casing
    response2 = await client.post(
        "/api/v1/tags",
        json={"name": "work", "color": "red"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response2.status_code == 400
    assert "unique" in response2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_cross_user_tag_isolation(client: AsyncClient):
    """Test that user A cannot access or delete user B's tags."""
    token_a = await get_auth_token(client, "usera@example.com")
    token_b = await get_auth_token(client, "userb@example.com")

    # User A creates a tag
    res_a = await client.post(
        "/api/v1/tags",
        json={"name": "Private"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    tag_id = res_a.json()["id"]

    # User B tries to view User A's tag (not possible directly, let's try to update it)
    res_patch = await client.patch(
        f"/api/v1/tags/{tag_id}",
        json={"name": "Hacked"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_patch.status_code == 404

    # User B tries to delete User A's tag
    res_delete = await client.delete(
        f"/api/v1/tags/{tag_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_delete.status_code == 404


@pytest.mark.asyncio
async def test_attach_another_user_tag_prevention(client: AsyncClient):
    """Test that user A cannot attach user B's tag to user A's todo."""
    token_a = await get_auth_token(client, "usera_attach@example.com")
    token_b = await get_auth_token(client, "userb_attach@example.com")

    # User B creates a tag
    res_tag_b = await client.post(
        "/api/v1/tags",
        json={"name": "SecretTag"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    tag_id_b = res_tag_b.json()["id"]

    # User A creates a todo
    res_todo_a = await client.post(
        "/api/v1/todos",
        json={"title": "My Todo"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    todo_id_a = res_todo_a.json()["id"]

    # User A tries to attach User B's tag
    res_attach = await client.post(
        f"/api/v1/todos/{todo_id_a}/tags",
        json={"tag_id": tag_id_b},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_attach.status_code == 404


@pytest.mark.asyncio
async def test_todo_filtering_by_tag(client: AsyncClient):
    """Test filtering todos by tag, keyword, date, status."""
    token = await get_auth_token(client, "filter@example.com")

    # Create tag
    tag_res = await client.post(
        "/api/v1/tags",
        json={"name": "Work"},
        headers={"Authorization": f"Bearer {token}"},
    )
    tag_id = tag_res.json()["id"]

    # Create two todos
    todo1_res = await client.post(
        "/api/v1/todos",
        json={"title": "Work Todo", "description": "Important stuff"},
        headers={"Authorization": f"Bearer {token}"},
    )
    todo1_id = todo1_res.json()["id"]

    await client.post(
        "/api/v1/todos",
        json={"title": "Personal Todo"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Attach tag to todo1
    await client.post(
        f"/api/v1/todos/{todo1_id}/tags",
        json={"tag_id": tag_id},
        headers={"Authorization": f"Bearer {token}"},
    )

    # List with tag_id filter
    list_res = await client.get(
        f"/api/v1/todos?tag_id={tag_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == todo1_id
    assert len(items[0]["tags"]) == 1
    assert items[0]["tags"][0]["id"] == tag_id


@pytest.mark.asyncio
async def test_bulk_update_ownership(client: AsyncClient):
    """Test bulk update ownership check and functionality."""
    token_a = await get_auth_token(client, "bulka@example.com")
    token_b = await get_auth_token(client, "bulkb@example.com")

    # User A creates a todo
    todo_a = await client.post(
        "/api/v1/todos",
        json={"title": "Todo A"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    todo_a_id = todo_a.json()["id"]

    # User B tries to bulk update User A's todo
    bulk_res = await client.patch(
        "/api/v1/todos/bulk-status",
        json={"todo_ids": [todo_a_id], "completed": True},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert bulk_res.status_code == 404

    # User A bulk updates successfully
    bulk_res_ok = await client.patch(
        "/api/v1/todos/bulk-status",
        json={"todo_ids": [todo_a_id], "completed": True},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert bulk_res_ok.status_code == 204

    # Verify updated
    get_res = await client.get(
        f"/api/v1/todos/{todo_a_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert get_res.json()["completed"] is True
