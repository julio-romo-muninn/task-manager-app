export interface Task {
  id?: string; 
  nombreTarea: string;
  descripcion: string;
  fechaRegistro: Date;
  fechaLimite: Date;
  completada: boolean;
  ownerId: string;
}