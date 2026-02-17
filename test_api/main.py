from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid

app = FastAPI(title="MCP Test API", version="1.0.0")

# In-memory storage
class Database:
    def __init__(self):
        self.tasks: Dict[str, dict] = {}

    def clear(self):
        self.tasks = {}

db = Database()

# Models
class Task(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    user_id: str
    completed: bool = False

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    user_id: str

# Routes
@app.post("/users/{user_id}/tasks", response_model=Task, operation_id="create_task")
def create_task(user_id: str, task: TaskCreate):
    task_id = str(uuid.uuid4())
    new_task = Task(
        id=task_id,
        title=task.title,
        description=task.description,
        user_id=user_id
    )
    db.tasks[task_id] = new_task.dict()
    return new_task

@app.get("/tasks", response_model=List[Task], operation_id="get_all_tasks")
def get_all_tasks():
    return list(db.tasks.values())

@app.get("/users/{user_id}/tasks", response_model=List[Task], operation_id="get_tasks_by_user")
def get_tasks_by_user(user_id: str):
    return [task for task in db.tasks.values() if task["user_id"] == user_id]

@app.delete("/tasks/{task_id}", response_model=Dict[str, str], operation_id="delete_task")
def delete_task(task_id: str):
    if task_id not in db.tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    del db.tasks[task_id]
    return {"status": "deleted", "id": task_id}

@app.get("/openapi.json", include_in_schema=False)
def get_openapi():
    return app.openapi()

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
