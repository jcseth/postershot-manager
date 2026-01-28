'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { 
  KPIsDashboard, 
  CuotaMensualRow,
  EventoRow,
  ArchivoSubidoRow 
} from '@/types/database';

export function useFinancialData(year: number, month: number) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KPIsDashboard | null>(null);
  const [cuotas, setCuotas] = useState<CuotaMensualRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener cuotas del año
      const { data: cuotasData, error: cuotasError } = await supabase
        .from('cuotas_mensuales')
        .select('*')
        .eq('anio', year)
        .order('mes');

      if (cuotasError) throw cuotasError;
      setCuotas(cuotasData || []);

      // 2. Obtener cuota del mes actual
      const cuotaMes = cuotasData?.find(c => c.mes === month);

      // 3. Calcular fechas del mes
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      // 4. Ventas de eventos del mes
      const { data: ventasEventos } = await supabase
        .from('ventas_evento')
        .select('total')
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      const totalVentasEventos = ventasEventos?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;

      // 5. Pagos de suscripción del mes
      const { data: pagosSubs } = await supabase
        .from('pagos_suscripcion')
        .select('monto')
        .eq('status', 'pagado')
        .gte('fecha_pago', startDate)
        .lte('fecha_pago', endDate);

      const totalSuscripciones = pagosSubs?.reduce((sum, p) => sum + (p.monto || 0), 0) || 0;

      // 6. Desbloqueos del mes
      const { data: desbloqueos } = await supabase
        .from('desbloqueos')
        .select('total')
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      const totalDesbloqueos = desbloqueos?.reduce((sum, d) => sum + (d.total || 0), 0) || 0;

      // 7. Ventas online del mes
      const { data: ventasOnline } = await supabase
        .from('ventas_online')
        .select('total')
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      const totalOnline = ventasOnline?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;

      // 8. Ventas inventario a suscriptores
      const { data: ventasInv } = await supabase
        .from('ventas_inventario_suscriptor')
        .select('total_venta')
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      const totalInventario = ventasInv?.reduce((sum, v) => sum + (v.total_venta || 0), 0) || 0;

      // 9. Suscriptores activos
      const { count: suscriptoresActivos } = await supabase
        .from('suscriptores')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'activo');

      // Calcular total de ventas (eventos + online para la cuota principal)
      const ventasReales = totalVentasEventos + totalOnline;

      setKpis({
        ventasReales,
        cuotaVentas: cuotaMes?.cuota_venta || 0,
        suscriptoresActivos: suscriptoresActivos || 0,
        cuotaSuscriptores: cuotaMes?.cuota_suscripciones || 0,
        ingresosMes: {
          eventos: totalVentasEventos,
          suscripciones: totalSuscripciones,
          desbloqueos: totalDesbloqueos,
          online: totalOnline,
          inventario: totalInventario,
        },
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { kpis, cuotas, loading, error, refetch: fetchData };
}

export function useEventos() {
  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('eventos')
        .select('*')
        .order('fecha_inicio', { ascending: false });
      setEventos(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  return { eventos, loading };
}

export function useArchivosSubidos() {
  const [archivos, setArchivos] = useState<ArchivoSubidoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArchivos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('archivos_subidos')
      .select('*')
      .neq('status', 'eliminado')
      .order('fecha_subida', { ascending: false });
    setArchivos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchArchivos();
  }, [fetchArchivos]);

  const eliminarArchivo = async (id: string) => {
    await supabase
      .from('archivos_subidos')
      .update({ status: 'eliminado' })
      .eq('id', id);
    fetchArchivos();
  };

  return { archivos, loading, refetch: fetchArchivos, eliminarArchivo };
}

export function useChartData(year: number) {
  const [data, setData] = useState<Array<{
    name: string;
    meta: number;
    ingresos: number;
    mes: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      // Obtener cuotas
      const { data: cuotas } = await supabase
        .from('cuotas_mensuales')
        .select('*')
        .eq('anio', year);

      // Obtener ingresos por mes
      const chartData = await Promise.all(
        meses.map(async (name, index) => {
          const mes = index + 1;
          const startDate = `${year}-${String(mes).padStart(2, '0')}-01`;
          const endDate = new Date(year, mes, 0).toISOString().split('T')[0];

          // Ventas eventos
          const { data: ventasEventos } = await supabase
            .from('ventas_evento')
            .select('total')
            .gte('fecha', startDate)
            .lte('fecha', endDate);

          // Ventas online
          const { data: ventasOnline } = await supabase
            .from('ventas_online')
            .select('total')
            .gte('fecha', startDate)
            .lte('fecha', endDate);

          const ingresos = 
            (ventasEventos?.reduce((s, v) => s + (v.total || 0), 0) || 0) +
            (ventasOnline?.reduce((s, v) => s + (v.total || 0), 0) || 0);

          const cuotaMes = cuotas?.find(c => c.mes === mes);

          return {
            name,
            mes,
            meta: cuotaMes?.cuota_venta || 0,
            ingresos,
          };
        })
      );

      setData(chartData);
      setLoading(false);
    }
    fetch();
  }, [year]);

  return { data, loading };
}
