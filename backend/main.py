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
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    host = os.getenv("MYSQLHOST")
    port = os.getenv("MYSQLPORT")
    user = os.getenv("MYSQLUSER")
    password = os.getenv("MYSQLPASSWORD")
    database = os.getenv("MYSQLDATABASE")
    
    if not host:
        raise Exception("MYSQLHOST environment variable not set")
    return mysql.connector.connect(
        host=host,
        port=int(port) if port else 3306,
        user=user,
        password=password,
        database=database,
        buffered=True
    )

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            uid VARCHAR(255) PRIMARY KEY,
            email VARCHAR(255),
            displayName VARCHAR(255),
            photoURL TEXT,
            createdAt DATETIME NOT NULL
        )
    """)
    conn.commit()
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

class UserCreate(BaseModel):
    uid: str
    email: Optional[str] = None
    displayName: Optional[str] = None
    photoURL: Optional[str] = None

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

db_initialized = False

@app.on_event("startup")
def startup():
    global db_initialized
    try:
        init_db()
        db_initialized = True
    except Exception as e:
        print(f"Warning: Could not connect to MySQL on startup: {e}")
        print("Will retry on first request...")

@app.get("/")
def home():
    return {"message": "API funcionando"}

@app.get("/health")
def health_check():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchall()
        cursor.close()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/init-tables")
def init_tables():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                uid VARCHAR(255) PRIMARY KEY,
                email VARCHAR(255),
                displayName VARCHAR(255),
                photoURL TEXT,
                createdAt DATETIME NOT NULL
            )
        """)
        conn.commit()
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
        return {"message": "Tables created successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/users", status_code=201)
def create_or_update_user(user: UserCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO users (uid, email, displayName, photoURL, createdAt)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                email = VALUES(email),
                displayName = VALUES(displayName),
                photoURL = VALUES(photoURL)
        """, (user.uid, user.email, user.displayName, user.photoURL, datetime.now()))
        conn.commit()
        return {"message": "User saved", "uid": user.uid}
    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/users", response_model=List[dict])
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        for u in users:
            for key, value in u.items():
                if isinstance(value, datetime):
                    u[key] = value.isoformat()
        return users
    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

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
