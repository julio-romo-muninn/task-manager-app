import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, updateDoc, deleteDoc, doc, CollectionReference } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Task } from '../models/tasks.model';

@Injectable({
  providedIn: 'root'
})
export class TasksService {

  private tasksCollection: CollectionReference<Task>;
  private readonly RAILWAY_API_URL = 'https://task-manager-app-production-0fb2.up.railway.app';

  constructor(private firestore: Firestore) {
    this.tasksCollection = collection(this.firestore, 'tasks') as CollectionReference<Task>;
  }

  getTasks(): Observable<Task[]> {
    return collectionData(this.tasksCollection, {
      idField: 'id'
    }) as Observable<Task[]>;
  }

  async addTask(task: Task) {
    const docRef = await addDoc(this.tasksCollection, task);
    const taskWithId = {
      ...task,
      id: docRef.id,
      fechaRegistro: task.fechaRegistro ? new Date(task.fechaRegistro).toISOString() : new Date().toISOString(),
      fechaLimite: task.fechaLimite ? new Date(task.fechaLimite).toISOString() : null
    };
    
    console.log('Attempting to mirror to Railway:', this.RAILWAY_API_URL, taskWithId);
    
    try {
      const response = await fetch(`${this.RAILWAY_API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskWithId)
      });
      console.log('Railway response:', response.status);
      if (!response.ok) {
        const error = await response.text();
        console.error('Railway error:', error);
      }
    } catch (error) {
      console.error('Failed to mirror to Railway:', error);
    }
    
    return docRef;
  }

  async updateTask(id: string, task: Task) {
    const taskDoc = doc(this.firestore, `tasks/${id}`);
    await updateDoc(taskDoc, { ...task });
    
    const taskUpdate = {
      nombreTarea: task.nombreTarea,
      descripcion: task.descripcion,
      fechaLimite: task.fechaLimite ? new Date(task.fechaLimite).toISOString() : null,
      completada: task.completada
    };
    
    try {
      await fetch(`${this.RAILWAY_API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskUpdate)
      });
    } catch (error) {
      console.error('Failed to update in Railway:', error);
    }
  }

  async deleteTask(id: string) {
    const taskDoc = doc(this.firestore, `tasks/${id}`);
    await deleteDoc(taskDoc);
    
    try {
      await fetch(`${this.RAILWAY_API_URL}/tasks/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Failed to delete from Railway:', error);
    }
  }

}
