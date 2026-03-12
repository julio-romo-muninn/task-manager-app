import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TasksService } from '../../services/tasks.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';
import { Task } from '../../models/tasks.model';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.css']
})
export class TasksComponent implements OnInit {

  taskForm: FormGroup;
  tasks: Task[] = [];
  allTasks: Task[] = [];
  editingId: string | null = null;
  user$: Observable<User | null>;

  completedTasks = 0;
  pendingTasks = 0;
  today = new Date();

  constructor(
    private fb: FormBuilder,
    private tasksService: TasksService,
    private authService: AuthService,
    private router: Router
  ) {

    this.taskForm = this.fb.group({

      nombreTarea: ['', [
        Validators.required,
        Validators.minLength(3)
      ]],

      descripcion: ['', [
        Validators.required,
        Validators.minLength(5)
      ]],

      fechaRegistro: ['', Validators.required],

      fechaLimite: ['', Validators.required]

    });

    this.user$ = this.authService.user$;

  }

  ngOnInit(): void {
    this.loadTasks();
  }

  // ======================
  // CARGAR TAREAS
  // ======================

  loadTasks() {

    this.tasksService.getTasks().subscribe({
      next: (data) => {
        this.tasks = data;
        this.allTasks = data;
        this.updateCounters();
      },
      error: (error) => {
        console.error('Error al cargar tareas', error);
      }
    });

  }

  // ======================
  // CONTADORES
  // ======================

  updateCounters() {

    this.completedTasks = this.tasks.filter(t => t.completada).length;
    this.pendingTasks = this.tasks.filter(t => !t.completada).length;

  }

  // ======================
  // FILTRO
  // ======================

  filterTasks(type: string) {

    if (type === 'completed') {
      this.tasks = this.allTasks.filter(t => t.completada);
    }

    else if (type === 'pending') {
      this.tasks = this.allTasks.filter(t => !t.completada);
    }

    else {
      this.tasks = this.allTasks;
    }

    this.updateCounters();

  }

  // ======================
  // GUARDAR / ACTUALIZAR
  // ======================

  onSubmit() {

    if (this.taskForm.valid) {

      const task: Task = {
        ...this.taskForm.value,
        fechaRegistro: new Date(this.taskForm.value.fechaRegistro),
        fechaLimite: new Date(this.taskForm.value.fechaLimite),
        completada: false
      };

      if (this.editingId) {
        this.updateTask(task);
      } else {
        this.addTask(task);
      }

    } else {
      alert('Completa todos los campos');
    }

  }

  // ======================
  // AGREGAR TAREA
  // ======================

  addTask(task: Task) {

    this.authService.user$.subscribe(user => {

      if (user) {

        const taskWithOwner: Task = {
          ...task,
          ownerId: user.uid
        };

        this.tasksService.addTask(taskWithOwner)
          .then(() => {
            alert('Tarea agregada');
            this.resetForm();
          })
          .catch(error => {
            console.error(error);
          });

      }

    });

  }

  // ======================
  // ACTUALIZAR
  // ======================

  updateTask(task: Task) {

    if (this.editingId) {

      this.tasksService.updateTask(this.editingId, task)
        .then(() => {
          alert('Tarea actualizada');
          this.resetForm();
        })
        .catch(error => {
          console.error(error);
        });

    }

  }

  // ======================
  // EDITAR
  // ======================

  editTask(task: Task) {

    this.editingId = task.id || null;

    this.taskForm.patchValue({
      nombreTarea: task.nombreTarea,
      descripcion: task.descripcion,
      fechaRegistro: this.formatDate(task.fechaRegistro),
      fechaLimite: this.formatDate(task.fechaLimite)
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

  }

  // ======================
  // ELIMINAR
  // ======================

  deleteTask(id: string | undefined) {

    if (!id) return;

    if (confirm('¿Eliminar tarea?')) {

      this.tasksService.deleteTask(id)
        .then(() => {
          alert('Tarea eliminada');
        })
        .catch(error => {
          console.error(error);
        });

    }

  }

  // ======================
  // MARCAR COMPLETADA
  // ======================

  toggleComplete(task: Task) {

    if (!task.id) return;

    this.tasksService.updateTask(task.id, {
      ...task,
      completada: !task.completada
    });

  }

  // ======================
  // UTILIDADES
  // ======================

  resetForm() {
    this.taskForm.reset();
    this.editingId = null;
  }

  formatDate(date: any): string {

    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }

    if (date?.toDate) {
      return date.toDate().toISOString().split('T')[0];
    }

    return '';
  }

  logout() {

    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });

  }

}