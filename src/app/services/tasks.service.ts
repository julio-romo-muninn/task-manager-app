import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, updateDoc, deleteDoc, doc, CollectionReference } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Task } from '../models/tasks.model';

@Injectable({
  providedIn: 'root'
})
export class TasksService {

  private tasksCollection: CollectionReference<Task>;

  constructor(private firestore: Firestore) {

    // referencia a la colección "tasks"
    this.tasksCollection = collection(this.firestore, 'tasks') as CollectionReference<Task>;

  }

  // =========================
  // OBTENER TAREAS
  // =========================

  getTasks(): Observable<Task[]> {

    return collectionData(this.tasksCollection, {
      idField: 'id'
    }) as Observable<Task[]>;

  }

  // =========================
  // AGREGAR TAREA
  // =========================

  addTask(task: Task) {

    return addDoc(this.tasksCollection, task);

  }

  // =========================
  // ACTUALIZAR TAREA
  // =========================

  updateTask(id: string, task: Task) {

    const taskDoc = doc(this.firestore, `tasks/${id}`);
    return updateDoc(taskDoc, { ...task });

  }

  // =========================
  // ELIMINAR TAREA
  // =========================

  deleteTask(id: string) {

    const taskDoc = doc(this.firestore, `tasks/${id}`);
    return deleteDoc(taskDoc);

  }

}