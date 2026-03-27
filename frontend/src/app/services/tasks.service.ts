import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Firestore, collection, collectionData, addDoc, updateDoc, deleteDoc, doc, CollectionReference } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Task } from '../models/tasks.model';

@Injectable({
  providedIn: 'root'
})
export class TasksService {

  private tasksCollection: CollectionReference<Task>;
  private readonly RAILWAY_API_URL = 'https://task-manager-app-production-0fb2.up.railway.app';

  constructor(private firestore: Firestore, private http: HttpClient) {
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

    this.http.post(`${this.RAILWAY_API_URL}/tasks`, taskWithId).subscribe({
      next: (res) => console.log('Task mirrored to Railway:', res),
      error: (err) => console.error('Failed to mirror task to Railway:', err)
    });

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

    this.http.put(`${this.RAILWAY_API_URL}/tasks/${id}`, taskUpdate).subscribe({
      next: () => console.log('Task updated in Railway'),
      error: (err) => console.error('Failed to update in Railway:', err)
    });
  }

  async deleteTask(id: string) {
    const taskDoc = doc(this.firestore, `tasks/${id}`);
    await deleteDoc(taskDoc);

    this.http.delete(`${this.RAILWAY_API_URL}/tasks/${id}`).subscribe({
      next: () => console.log('Task deleted from Railway'),
      error: (err) => console.error('Failed to delete from Railway:', err)
    });
  }

}
