import os
import mysql.connector
from mysql.connector import Error
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST"),
        port=int(os.getenv("MYSQL_PORT", 3306)),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE")
    )

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id VARCHAR(255) PRIMARY KEY,
            nombreTarea VARCHAR(255) NOT NULL,
            descripcion TEXT,
            fechaRegistro DATETIME NOT NULL,
            fechaLimite DATETIME,
            completada BOOLEAN DEFAULT FALSE,
            ownerId VARCHAR(255) NOT NULL
        )
    """)
    conn.commit()
    cursor.close()
    conn.close()

class Task(BaseModel):
    id: Optional[str] = None
    nombreTarea: str
    descripcion: str = ""
    fechaRegistro: datetime
    fechaLimite: Optional[datetime] = None
    completada: bool = False
    ownerId: str

class TaskUpdate(BaseModel):
    nombreTarea: Optional[str] = None
    descripcion: Optional[str] = None
    fechaLimite: Optional[datetime] = None
    completada: Optional[bool] = None

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
def home():
    return {"message": "API funcionando"}

@app.post("/tasks", status_code=201)
def create_task(task: Task):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO tasks (id, nombreTarea, descripcion, fechaRegistro, fechaLimite, completada, ownerId)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (task.id, task.nombreTarea, task.descripcion, task.fechaRegistro, task.fechaLimite, task.completada, task.ownerId))
        conn.commit()
        return {"message": "Task created", "id": task.id}
    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/tasks", response_model=List[dict])
def get_tasks():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM tasks")
        tasks = cursor.fetchall()
        for task in tasks:
            for key, value in task.items():
                if isinstance(value, datetime):
                    task[key] = value.isoformat()
                elif value is None:
                    task[key] = None
        return tasks
    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/tasks/{task_id}", response_model=dict)
def get_task(task_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
        task = cursor.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        for key, value in task.items():
            if isinstance(value, datetime):
                task[key] = value.isoformat()
            elif value is None:
                task[key] = None
        return task
    finally:
        cursor.close()
        conn.close()

@app.put("/tasks/{task_id}")
def update_task(task_id: str, task: TaskUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        updates = []
        values = []
        if task.nombreTarea is not None:
            updates.append("nombreTarea = %s")
            values.append(task.nombreTarea)
        if task.descripcion is not None:
            updates.append("descripcion = %s")
            values.append(task.descripcion)
        if task.fechaLimite is not None:
            updates.append("fechaLimite = %s")
            values.append(task.fechaLimite)
        if task.completada is not None:
            updates.append("completada = %s")
            values.append(task.completada)
        
        if not updates:
            return {"message": "No fields to update"}
        
        values.append(task_id)
        query = f"UPDATE tasks SET {', '.join(updates)} WHERE id = %s"
        cursor.execute(query, values)
        conn.commit()
        return {"message": "Task updated"}
    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.delete("/tasks/{task_id}")
def delete_task(task_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"message": "Task deleted"}
    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
