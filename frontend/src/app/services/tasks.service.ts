import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Firestore, collection, collectionData, addDoc, updateDoc, deleteDoc, doc, query, where, CollectionReference } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { Task } from '../models/tasks.model';

@Injectable({
  providedIn: 'root'
})
export class TasksService {

  private tasksCollection: CollectionReference<Task>;
  private readonly RAILWAY_API_URL = 'https://task-manager-app-production-0fb2.up.railway.app';

  constructor(private firestore: Firestore, private http: HttpClient, private auth: Auth) {
    this.tasksCollection = collection(this.firestore, 'tasks') as CollectionReference<Task>;
  }

  getTasks(): Observable<Task[]> {
    return user(this.auth).pipe(
      switchMap(currentUser => {
        if (!currentUser) return of([]);
        const q = query(this.tasksCollection, where('ownerId', '==', currentUser.uid));
        return collectionData(q, { idField: 'id' }).pipe(
          map(tasks => tasks.map((task: any) => ({
            ...task,
            fechaRegistro: task.fechaRegistro?.toDate ? task.fechaRegistro.toDate() : new Date(task.fechaRegistro),
            fechaLimite: task.fechaLimite?.toDate ? task.fechaLimite.toDate() : new Date(task.fechaLimite)
          })))
        );
      })
    ) as Observable<Task[]>;
  }

  async addTask(task: Task) {
    const docRef = await addDoc(this.tasksCollection, task);
    const taskWithId = {
      ...task,
      id: docRef.id,
      fechaRegistro: task.fechaRegistro ? new Date(task.fechaRegistro).toISOString() : new Date().toISOString(),
      fechaLimite: task.fechaLimite ? new Date(task.fechaLimite).toISOString() : null
    };

    try {
      const response = await fetch(`${this.RAILWAY_API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskWithId)
      });
      console.log('Task mirrored to Railway:', response.status);
    } catch (error) {
      console.error('Failed to mirror task to Railway:', error);
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