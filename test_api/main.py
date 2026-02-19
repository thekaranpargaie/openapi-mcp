from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid

app = FastAPI(title="MCP Test API", version="2.0.0")

# ---------------------------------------------------------------------------
# In-memory store
# ---------------------------------------------------------------------------
class Database:
    def __init__(self):
        self.users: Dict[str, dict] = {}
        self.tasks: Dict[str, dict] = {}

    def clear(self):
        self.users = {}
        self.tasks = {}

db = Database()

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class User(BaseModel):
    id: str
    name: str

class UserCreate(BaseModel):
    name: str

class Task(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    user_id: str
    completed: bool = False

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None

# ---------------------------------------------------------------------------
# User routes
# ---------------------------------------------------------------------------

@app.post("/users", response_model=User, operation_id="create_user", status_code=201)
def create_user(body: UserCreate):
    """Create a new user and return their generated ID."""
    user_id = str(uuid.uuid4())
    user = User(id=user_id, name=body.name)
    db.users[user_id] = user.dict()
    return user


@app.get("/users", response_model=List[User], operation_id="search_users")
def search_users(
    name: Optional[str] = Query(None, description="Fuzzy name filter (case-insensitive substring match)")
):
    """
    List all users. Optionally filter by name using a case-insensitive
    substring match (fuzzy search). Use this to look up a user's ID by name.
    """
    users = list(db.users.values())
    if name:
        needle = name.lower()
        users = [u for u in users if needle in u["name"].lower()]
    return users


@app.get("/users/{user_id}", response_model=User, operation_id="get_user")
def get_user(user_id: str):
    """Get a single user by their ID."""
    user = db.users.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.delete("/users/{user_id}", response_model=Dict[str, str], operation_id="delete_user")
def delete_user(user_id: str):
    """Delete a user and all their tasks."""
    if user_id not in db.users:
        raise HTTPException(status_code=404, detail="User not found")
    del db.users[user_id]
    # Cascade-delete tasks
    to_remove = [tid for tid, t in db.tasks.items() if t["user_id"] == user_id]
    for tid in to_remove:
        del db.tasks[tid]
    return {"status": "deleted", "id": user_id}


# ---------------------------------------------------------------------------
# Task routes
# ---------------------------------------------------------------------------

@app.post("/users/{user_id}/tasks", response_model=Task, operation_id="create_task", status_code=201)
def create_task(user_id: str, body: TaskCreate):
    """Create a task for a user."""
    if user_id not in db.users:
        raise HTTPException(status_code=404, detail="User not found")
    task_id = str(uuid.uuid4())
    task = Task(id=task_id, title=body.title, description=body.description, user_id=user_id)
    db.tasks[task_id] = task.dict()
    return task


@app.get("/users/{user_id}/tasks", response_model=List[Task], operation_id="get_tasks_by_user")
def get_tasks_by_user(user_id: str):
    """Get all tasks belonging to a specific user."""
    if user_id not in db.users:
        raise HTTPException(status_code=404, detail="User not found")
    return [t for t in db.tasks.values() if t["user_id"] == user_id]


@app.get("/tasks", response_model=List[Task], operation_id="get_all_tasks")
def get_all_tasks():
    """Get all tasks across all users."""
    return list(db.tasks.values())


@app.patch("/tasks/{task_id}", response_model=Task, operation_id="update_task")
def update_task(task_id: str, body: TaskUpdate):
    """Update a task's title, description, or completed status."""
    task = db.tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if body.title is not None:
        task["title"] = body.title
    if body.description is not None:
        task["description"] = body.description
    if body.completed is not None:
        task["completed"] = body.completed
    db.tasks[task_id] = task
    return task


@app.delete("/tasks/{task_id}", response_model=Dict[str, str], operation_id="delete_task")
def delete_task(task_id: str):
    """Delete a task by ID."""
    if task_id not in db.tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    del db.tasks[task_id]
    return {"status": "deleted", "id": task_id}


# ---------------------------------------------------------------------------
# OpenAPI passthrough (for MCP loader)
# ---------------------------------------------------------------------------

@app.get("/openapi.json", include_in_schema=False)
def get_openapi():
    return app.openapi()


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
