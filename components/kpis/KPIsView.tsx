'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type KPITab = 'eventos' | 'suscripciones' | 'online';

interface EventoKPI {
  id: string;
  nombre: string;
  fecha: string;
  ventas: number;
  gastos: number;
  utilidad: number;
  ticketPromedio: number;
  transacciones: number;
  desglose: {
    personal: number;
    viaticos: number;
    operativo: number;
    fee: number;
    otros: number;
  };
}

interface SuscripcionesKPI {
  activos: number;
  nuevos: number;
  cancelados: number;
  churn: number;
  mrr: number;
}

interface CampanaKPI {
  id: string;
  nombre: string;
  plataforma: string;
  leads: number;
  convertidos: number;
  conversion: number;
  gasto: number;
  ventas: number;
  cac: number;
  roas: number;
}

export default function KPIsView() {
  const [activeTab, setActiveTab] = useState<KPITab>('eventos');
  const [eventosKPIs, setEventosKPIs] = useState<EventoKPI[]>([]);
  const [suscripcionesKPI, setSuscripcionesKPI] = useState<SuscripcionesKPI | null>(null);
  const [campanasKPIs, setCampanasKPIs] = useState<CampanaKPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch eventos con sus KPIs
      const { data: eventos } = await supabase
        .from('eventos')
        .select('*')
        .order('fecha_inicio', { ascending: false })
        .limit(20);

      if (eventos) {
        const eventosConKPIs = await Promise.all(
          eventos.map(async (evento: any) => {
            const { data: ventas } = await supabase
              .from('ventas_evento')
              .select('total, cantidad')
              .eq('evento_id', evento.id);

            const { data: gastos } = await supabase
              .from('gastos_evento')
              .select('monto, categoria')
              .eq('evento_id', evento.id);

            const totalVentas = ventas?.reduce((s: number, v: any) => s + (v.total || 0), 0) || 0;
            const totalGastos = gastos?.reduce((s: number, g: any) => s + (g.monto || 0), 0) || 0;
            const numTransacciones = ventas?.length || 0;

            // Desglose por categoría
            const desglose = {
              personal: gastos?.filter((g: any) => g.categoria === 'personal').reduce((s: number, g: any) => s + g.monto, 0) || 0,
              viaticos: gastos?.filter((g: any) => g.categoria === 'viaticos').reduce((s: number, g: any) => s + g.monto, 0) || 0,
              operativo: gastos?.filter((g: any) => g.categoria === 'operativo').reduce((s: number, g: any) => s + g.monto, 0) || 0,
              fee: gastos?.filter((g: any) => g.categoria === 'fee').reduce((s: number, g: any) => s + g.monto, 0) || 0,
              otros: gastos?.filter((g: any) => g.categoria === 'otros').reduce((s: number, g: any) => s + g.monto, 0) || 0,
            };

            return {
              id: evento.id,
              nombre: evento.nombre,
              fecha: evento.fecha_inicio,
              ventas: totalVentas,
              gastos: totalGastos,
              utilidad: totalVentas - totalGastos,
              ticketPromedio: numTransacciones > 0 ? totalVentas / numTransacciones : 0,
              transacciones: numTransacciones,
              desglose,
            };
          })
        );

        setEventosKPIs(eventosConKPIs);
      }

      // Fetch suscripciones KPIs
      const currentMonth = new Date().toISOString().slice(0, 7);
      const startOfMonth = `${currentMonth}-01`;

      const { count: activos } = await supabase
        .from('suscriptores')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'activo');

      const { count: nuevos } = await supabase
        .from('suscriptores')
        .select('*', { count: 'exact', head: true })
        .gte('fecha_inicio', startOfMonth);

      const { count: cancelados } = await supabase
        .from('suscriptores')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelado')
        .gte('fecha_cancelacion', startOfMonth);

      const { data: pagos } = await supabase
        .from('pagos_suscripcion')
        .select('monto')
        .eq('status', 'pagado')
        .gte('fecha_pago', startOfMonth);

      const mrr = pagos?.reduce((s: number, p: any) => s + (p.monto || 0), 0) || 0;
      const churnRate = activos && activos > 0 ? ((cancelados || 0) / activos) * 100 : 0;

      setSuscripcionesKPI({
        activos: activos || 0,
        nuevos: nuevos || 0,
        cancelados: cancelados || 0,
        churn: churnRate,
        mrr,
      });

      // Fetch campañas KPIs
      const { data: campanas } = await supabase
        .from('campanas')
        .select('*')
        .order('fecha_inicio', { ascending: false })
        .limit(10);

      if (campanas) {
        const campanasConKPIs = await Promise.all(
          campanas.map(async (campana: any) => {
            const { data: leads } = await supabase
              .from('leads')
              .select('convertido, monto_venta')
              .eq('campana_id', campana.id);

            const { data: ventas } = await supabase
              .from('ventas_online')
              .select('total')
              .eq('campana_id', campana.id);

            const totalLeads = leads?.length || 0;
            const convertidos = leads?.filter((l: any) => l.convertido).length || 0;
            const ventasLeads = leads?.filter((l: any) => l.convertido && l.monto_venta).reduce((s: number, l: any) => s + (l.monto_venta || 0), 0) || 0;
            const ventasDirectas = ventas?.reduce((s: number, v: any) => s + (v.total || 0), 0) || 0;
            const totalVentas = ventasLeads + ventasDirectas;
            const gasto = campana.gasto_real || 0;

            return {
              id: campana.id,
              nombre: campana.nombre,
              plataforma: campana.plataforma || 'N/A',
              leads: totalLeads,
              convertidos,
              conversion: totalLeads > 0 ? (convertidos / totalLeads) * 100 : 0,
              gasto,
              ventas: totalVentas,
              cac: totalLeads > 0 ? gasto / totalLeads : 0,
              roas: gasto > 0 ? totalVentas / gasto : 0,
            };
          })
        );

        setCampanasKPIs(campanasConKPIs);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  const tabs = [
    { id: 'eventos' as const, label: 'Eventos', icon: Calendar, count: eventosKPIs.length },
    { id: 'suscripciones' as const, label: 'Suscripciones', icon: Users, count: suscripcionesKPI?.activos || 0 },
    { id: 'online' as const, label: 'Campañas', icon: TrendingUp, count: campanasKPIs.length },
  ];

  return (
    <div className="space-y-6">
      
      {/* TABS */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-gray-100' : 'bg-gray-200'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : (
        <>
          {/* EVENTOS TAB */}
          {activeTab === 'eventos' && (
            <div className="space-y-4">
              {eventosKPIs.length === 0 ? (
                <EmptyState 
                  icon={Calendar}
                  title="Sin eventos"
                  description="Carga tu primer archivo de evento para ver los KPIs"
                />
              ) : (
                eventosKPIs.map((evento) => (
                  <div key={evento.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* Header del evento */}
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{evento.nombre}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(evento.fecha).toLocaleDateString('es-MX', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1 text-sm font-semibold ${
                        evento.utilidad >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {evento.utilidad >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        ${Math.abs(evento.utilidad).toLocaleString()}
                        <span className="text-xs font-normal text-gray-400 ml-1">utilidad</span>
                      </div>
                    </div>

                    {/* Métricas principales */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
                      <MetricBox label="Ventas" value={`$${evento.ventas.toLocaleString()}`} />
                      <MetricBox label="Gastos" value={`$${evento.gastos.toLocaleString()}`} />
                      <MetricBox label="Ticket Promedio" value={`$${evento.ticketPromedio.toFixed(0)}`} />
                      <MetricBox 
                        label="Margen" 
                        value={`${evento.ventas > 0 ? ((evento.utilidad / evento.ventas) * 100).toFixed(1) : 0}%`} 
                        highlight={evento.utilidad > 0}
                      />
                    </div>

                    {/* Desglose de gastos */}
                    <div className="px-5 pb-5">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Desglose de Gastos</p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <GastoItem label="Personal" value={evento.desglose.personal} total={evento.gastos} color="blue" />
                        <GastoItem label="Viáticos" value={evento.desglose.viaticos} total={evento.gastos} color="amber" />
                        <GastoItem label="Operativo" value={evento.desglose.operativo} total={evento.gastos} color="purple" />
                        <GastoItem label="Fee" value={evento.desglose.fee} total={evento.gastos} color="red" />
                        <GastoItem label="Otros" value={evento.desglose.otros} total={evento.gastos} color="gray" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SUSCRIPCIONES TAB */}
          {activeTab === 'suscripciones' && suscripcionesKPI && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard icon={Users} label="Activos" value={suscripcionesKPI.activos.toString()} color="green" />
                <StatCard icon={ArrowUpRight} label="Nuevos" value={`+${suscripcionesKPI.nuevos}`} color="blue" />
                <StatCard icon={ArrowDownRight} label="Cancelados" value={suscripcionesKPI.cancelados.toString()} color="red" />
                <StatCard icon={Percent} label="Churn" value={`${suscripcionesKPI.churn.toFixed(1)}%`} color="amber" />
                <StatCard icon={DollarSign} label="MRR" value={`$${suscripcionesKPI.mrr.toLocaleString()}`} color="green" />
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <p className="text-sm text-gray-500">
                  MRR = Monthly Recurring Revenue (Ingresos recurrentes mensuales de suscripciones)
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Churn = Tasa de cancelación (suscriptores que cancelan / activos totales)
                </p>
              </div>
            </div>
          )}

          {/* CAMPAÑAS TAB */}
          {activeTab === 'online' && (
            <div className="space-y-4">
              {campanasKPIs.length === 0 ? (
                <EmptyState 
                  icon={TrendingUp}
                  title="Sin campañas"
                  description="Carga tu primer archivo de campaña para ver los KPIs"
                />
              ) : (
                campanasKPIs.map((campana) => (
                  <div key={campana.id} className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{campana.nombre}</h3>
                        <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          {campana.plataforma}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">{campana.roas.toFixed(2)}x</p>
                        <p className="text-xs text-gray-500">ROAS</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <MetricBox label="Leads" value={campana.leads.toString()} />
                      <MetricBox label="Convertidos" value={campana.convertidos.toString()} />
                      <MetricBox label="Conversión" value={`${campana.conversion.toFixed(1)}%`} />
                      <MetricBox label="Gasto" value={`$${campana.gasto.toLocaleString()}`} />
                      <MetricBox label="CAC" value={`$${campana.cac.toFixed(0)}`} />
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        CAC = Costo de Adquisición por Cliente (Gasto / Leads) • 
                        ROAS = Retorno sobre inversión publicitaria (Ventas / Gasto)
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function GastoItem({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400',
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-medium text-gray-900">{percentage.toFixed(0)}%</span>
      </div>
      <p className="text-sm font-semibold text-gray-900">${value.toLocaleString()}</p>
      <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
        <div className={`h-full rounded-full ${colors[color]}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  color: 'green' | 'blue' | 'red' | 'amber';
}) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]} mb-2`}>
        <Icon size={16} />
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
      <Icon size={40} className="mx-auto mb-3 text-gray-300" />
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );
}
