// Tipos básicos para referencia (no se usan en Supabase client)
export interface KPIsDashboard {
  ventasReales: number;
  cuotaVentas: number;
  suscriptoresActivos: number;
  cuotaSuscriptores: number;
  ingresosMes: {
    eventos: number;
    suscripciones: number;
    desbloqueos: number;
    online: number;
    inventario: number;
  };
}

export interface CuotaMensualRow {
  id: string;
  anio: number;
  mes: number;
  cuota_venta: number;
  cuota_suscripciones: number;
  created_at: string;
}

export interface EventoRow {
  id: string;
  nombre: string;
  deporte: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  ubicacion: string | null;
  participantes_aprox: number | null;
  fee_entrada: number;
  status: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArchivoSubidoRow {
  id: string;
  nombre_archivo: string;
  tipo: 'evento' | 'suscripciones' | 'campana_online';
  evento_id: string | null;
  campana_id: string | null;
  fecha_subida: string;
  registros_procesados: number;
  status: 'procesado' | 'error' | 'eliminado';
  datos_json: Record<string, unknown> | null;
  notas: string | null;
}
