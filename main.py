from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import asyncio
from .simulation import SwarmManager

app = FastAPI(title="NASA-Grade Mission Control API")

# CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTHENTICATION (Simplified for Demo) ---
# In a real app, use SQLAlchemy and bcrypt. Here we use a mock for speed.
class User(BaseModel):
    username: str
    role: str # Admin, Operator, Viewer

users_db = {
    "admin": {"username": "admin", "password": "password", "role": "Admin"},
    "operator": {"username": "operator", "password": "password", "role": "Operator"}
}

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_db.get(form_data.username)
    if not user or form_data.password != user["password"]:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    return {"access_token": user["username"], "token_type": "bearer", "role": user["role"]}

# --- SIMULATION STATE ---
swarm = SwarmManager()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(swarm.run_loop())

@app.get("/state")
async def get_state():
    return swarm.get_state()

class TaskCreate(BaseModel):
    x: float
    y: float
    priority: int

@app.post("/tasks")
async def add_task(task: TaskCreate):
    t = swarm.add_task(task.x, task.y, task.priority)
    return {"status": "Task Added", "id": t.id}

@app.post("/control/pause")
async def pause_sim():
    swarm.is_running = False
    return {"status": "Paused"}

@app.post("/control/resume")
async def resume_sim():
    swarm.is_running = True
    return {"status": "Resumed"}

@app.post("/control/fail")
async def trigger_failure():
    data = swarm.trigger_failure()
    if data:
        return {"status": "Failure Simulated", "robot_id": data["id"]}
    return {"status": "No active robots left"}

class RobotDeploy(BaseModel):
    x: float
    y: float

@app.post("/robots/deploy")
async def deploy_robot(data: RobotDeploy):
    r = swarm.add_robot(data.x, data.y)
    return {"status": "Robot Deployed", "id": r.id}

@app.post("/control/reset")
async def reset_mission():
    swarm.reset()
    return {"status": "Mission Reset"}

@app.post("/control/clear-tasks")
async def clear_tasks():
    swarm.clear_tasks()
    return {"status": "Tasks Cleared"}

class AutoTaskToggle(BaseModel):
    enabled: bool

@app.post("/control/auto-task")
async def toggle_auto_task(data: AutoTaskToggle):
    swarm.auto_task_gen = data.enabled
    return {"status": "Auto Task Toggled", "enabled": data.enabled}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)



