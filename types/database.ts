export type Database = {
  public: {
    Tables: {
      productos: {
        Row: {
          id: string;
          nombre: string;
          precio_venta: number;
          costo_unitario: number;
          categoria: string;
          activo: boolean;
          created_at: string;
        };
        Insert: Omit<ProductoRow, 'id' | 'created_at'>;
        Update: Partial<Omit<ProductoRow, 'id'>>;
      };
      planes_suscripcion: {
        Row: {
          id: string;
          nombre: string;
          precio_mensual: number;
          costo_desbloqueo: number;
          orden: number;
          activo: boolean;
          created_at: string;
        };
      };
      cuotas_mensuales: {
        Row: {
          id: string;
          anio: number;
          mes: number;
          cuota_venta: number;
          cuota_suscripciones: number;
          created_at: string;
        };
      };
      eventos: {
        Row: {
          id: string;
          nombre: string;
          deporte: string | null;
          fecha_inicio: string;
          fecha_fin: string | null;
          ubicacion: string | null;
          participantes_aprox: number | null;
          fee_entrada: number;
          status: 'pendiente' | 'en_curso' | 'finalizado' | 'cancelado';
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<EventoRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<EventoRow, 'id'>>;
      };
      ventas_evento: {
        Row: {
          id: string;
          evento_id: string;
          fecha: string;
          cliente: string | null;
          producto_id: string | null;
          producto_nombre: string | null;
          precio_unitario: number;
          cantidad: number;
          total: number;
          metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'cashless';
          notas: string | null;
          created_at: string;
        };
      };
      gastos_evento: {
        Row: {
          id: string;
          evento_id: string;
          categoria: 'personal' | 'viaticos' | 'operativo' | 'fee' | 'otros';
          concepto: string;
          monto: number;
          fecha: string | null;
          metodo_pago: 'efectivo' | 'transferencia' | null;
          notas: string | null;
          created_at: string;
        };
      };
      suscriptores: {
        Row: {
          id: string;
          nombre: string;
          email: string | null;
          telefono: string | null;
          plan_id: string | null;
          fecha_inicio: string;
          fecha_cancelacion: string | null;
          status: 'activo' | 'pausado' | 'cancelado' | 'moroso';
          origen_adquisicion: 'meta_ads' | 'google_ads' | 'referido' | 'organico' | 'evento' | 'otro' | null;
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      pagos_suscripcion: {
        Row: {
          id: string;
          suscriptor_id: string;
          fecha_cobro: string;
          fecha_pago: string | null;
          monto: number;
          status: 'pendiente' | 'pagado' | 'vencido' | 'cancelado';
          metodo_pago: string | null;
          notas: string | null;
          created_at: string;
        };
      };
      desbloqueos: {
        Row: {
          id: string;
          suscriptor_id: string;
          fecha: string;
          cantidad: number;
          costo_unitario: number;
          total: number;
          notas: string | null;
          created_at: string;
        };
      };
      ventas_inventario_suscriptor: {
        Row: {
          id: string;
          suscriptor_id: string;
          fecha: string;
          producto_id: string | null;
          producto_nombre: string | null;
          cantidad: number;
          precio_venta: number;
          costo_nuestro: number;
          total_venta: number;
          total_costo: number;
          status: 'pendiente' | 'enviado' | 'entregado';
          notas: string | null;
          created_at: string;
        };
      };
      campanas: {
        Row: {
          id: string;
          nombre: string;
          tipo: 'venta_directa' | 'adquisicion_suscriptores';
          plataforma: 'meta_ads' | 'google_ads' | 'tiktok' | 'otro' | null;
          fecha_inicio: string;
          fecha_fin: string | null;
          presupuesto_total: number | null;
          gasto_real: number;
          status: 'activa' | 'pausada' | 'finalizada';
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      leads: {
        Row: {
          id: string;
          campana_id: string;
          fecha: string;
          nombre: string | null;
          telefono: string | null;
          email: string | null;
          convertido: boolean;
          fecha_conversion: string | null;
          monto_venta: number | null;
          suscriptor_id: string | null;
          notas: string | null;
          created_at: string;
        };
      };
      ventas_online: {
        Row: {
          id: string;
          campana_id: string | null;
          fecha: string;
          cliente: string | null;
          producto: string | null;
          cantidad: number;
          total: number;
          costo_envio: number;
          costo_producto: number;
          metodo_pago: string | null;
          notas: string | null;
          created_at: string;
        };
      };
      archivos_subidos: {
        Row: {
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
        };
      };
    };
  };
};

// Type aliases for convenience
export type ProductoRow = Database['public']['Tables']['productos']['Row'];
export type PlanSuscripcionRow = Database['public']['Tables']['planes_suscripcion']['Row'];
export type CuotaMensualRow = Database['public']['Tables']['cuotas_mensuales']['Row'];
export type EventoRow = Database['public']['Tables']['eventos']['Row'];
export type VentaEventoRow = Database['public']['Tables']['ventas_evento']['Row'];
export type GastoEventoRow = Database['public']['Tables']['gastos_evento']['Row'];
export type SuscriptorRow = Database['public']['Tables']['suscriptores']['Row'];
export type PagoSuscripcionRow = Database['public']['Tables']['pagos_suscripcion']['Row'];
export type DesbloqueoRow = Database['public']['Tables']['desbloqueos']['Row'];
export type VentaInventarioRow = Database['public']['Tables']['ventas_inventario_suscriptor']['Row'];
export type CampanaRow = Database['public']['Tables']['campanas']['Row'];
export type LeadRow = Database['public']['Tables']['leads']['Row'];
export type VentaOnlineRow = Database['public']['Tables']['ventas_online']['Row'];
export type ArchivoSubidoRow = Database['public']['Tables']['archivos_subidos']['Row'];

// Computed types for KPIs
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

export interface KPIsEvento {
  totalVentas: number;
  totalGastos: number;
  utilidadBruta: number;
  ticketPromedio: number;
  porcentajes: {
    personal: number;
    viaticos: number;
    fee: number;
    operativo: number;
    margen: number;
  };
}

export interface KPIsSuscripciones {
  activos: number;
  nuevos: number;
  cancelados: number;
  churnRate: number;
  mrr: number;
  ingresoDesbloqueos: number;
  ingresoInventario: number;
}

export interface KPIsCampana {
  totalLeads: number;
  convertidos: number;
  conversionRate: number;
  gastoTotal: number;
  ventasTotal: number;
  cac: number;
  cpa: number;
  roas: number;
}
