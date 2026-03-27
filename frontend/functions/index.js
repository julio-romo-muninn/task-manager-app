const functions = require('firebase-functions');
const axios = require('axios');

const RAILWAY_API_URL = process.env.RAILWAY_API_URL || 'https://tu-backend.up.railway.app';

exports.onTaskCreate = functions.firestore
  .document('tasks/{taskId}')
  .onCreate(async (snap, context) => {
    const task = snap.data();
    const taskId = context.params.taskId;
    
    try {
      const taskWithId = {
        ...task,
        id: taskId,
        fechaRegistro: task.fechaRegistro ? new Date(task.fechaRegistro).toISOString() : new Date().toISOString(),
        fechaLimite: task.fechaLimite ? new Date(task.fechaLimite).toISOString() : null
      };
      
      await axios.post(`${RAILWAY_API_URL}/tasks`, taskWithId);
      console.log(`Task ${taskId} mirrored to Railway`);
    } catch (error) {
      console.error('Error mirroring task to Railway:', error.message);
    }
  });

exports.onTaskUpdate = functions.firestore
  .document('tasks/{taskId}')
  .onUpdate(async (change, context) => {
    const task = change.after.data();
    const taskId = context.params.taskId;
    
    try {
      const taskUpdate = {
        nombreTarea: task.nombreTarea,
        descripcion: task.descripcion,
        fechaLimite: task.fechaLimite ? new Date(task.fechaLimite).toISOString() : null,
        completada: task.completada
      };
      
      await axios.put(`${RAILWAY_API_URL}/tasks/${taskId}`, taskUpdate);
      console.log(`Task ${taskId} updated in Railway`);
    } catch (error) {
      console.error('Error updating task in Railway:', error.message);
    }
  });

exports.onTaskDelete = functions.firestore
  .document('tasks/{taskId}')
  .onDelete(async (snap, context) => {
    const taskId = context.params.taskId;
    
    try {
      await axios.delete(`${RAILWAY_API_URL}/tasks/${taskId}`);
      console.log(`Task ${taskId} deleted from Railway`);
    } catch (error) {
      console.error('Error deleting task from Railway:', error.message);
    }
  });
