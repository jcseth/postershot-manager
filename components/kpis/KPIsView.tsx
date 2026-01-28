'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  TrendingUp,
  DollarSign,
  Zap,
  ShoppingBag,
  Target,
  ArrowUpRight,
  ArrowDownRight
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
  porcentajes: {
    personal: number;
    viaticos: number;
    fee: number;
    margen: number;
  };
}

interface SuscripcionesKPI {
  activos: number;
  nuevos: number;
  cancelados: number;
  churn: number;
  mrr: number;
  desbloqueos: number;
  inventario: number;
  porPlan: Array<{ plan: string; cantidad: number; ingreso: number }>;
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
        .limit(10);

      if (eventos) {
        const eventosConKPIs = await Promise.all(
          eventos.map(async (evento) => {
            const { data: ventas } = await supabase
              .from('ventas_evento')
              .select('total, cantidad')
              .eq('evento_id', evento.id);

            const { data: gastos } = await supabase
              .from('gastos_evento')
              .select('monto, categoria')
              .eq('evento_id', evento.id);

            const totalVentas = ventas?.reduce((s, v) => s + (v.total || 0), 0) || 0;
            const totalGastos = gastos?.reduce((s, g) => s + (g.monto || 0), 0) || 0;
            const numTransacciones = ventas?.length || 0;

            const gastosPorCategoria = {
              personal: gastos?.filter(g => g.categoria === 'personal').reduce((s, g) => s + g.monto, 0) || 0,
              viaticos: gastos?.filter(g => g.categoria === 'viaticos').reduce((s, g) => s + g.monto, 0) || 0,
              fee: gastos?.filter(g => g.categoria === 'fee').reduce((s, g) => s + g.monto, 0) || 0,
            };

            return {
              id: evento.id,
              nombre: evento.nombre,
              fecha: evento.fecha_inicio,
              ventas: totalVentas,
              gastos: totalGastos,
              utilidad: totalVentas - totalGastos,
              ticketPromedio: numTransacciones > 0 ? totalVentas / numTransacciones : 0,
              porcentajes: {
                personal: totalVentas > 0 ? (gastosPorCategoria.personal / totalVentas) * 100 : 0,
                viaticos: totalVentas > 0 ? (gastosPorCategoria.viaticos / totalVentas) * 100 : 0,
                fee: totalVentas > 0 ? (gastosPorCategoria.fee / totalVentas) * 100 : 0,
                margen: totalVentas > 0 ? ((totalVentas - totalGastos) / totalVentas) * 100 : 0,
              },
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

      const { data: desbloqueos } = await supabase
        .from('desbloqueos')
        .select('total')
        .gte('fecha', startOfMonth);

      const { data: inventario } = await supabase
        .from('ventas_inventario_suscriptor')
        .select('total_venta')
        .gte('fecha', startOfMonth);

      // Por plan
      const { data: suscriptoresPorPlan } = await supabase
        .from('suscriptores')
        .select('plan_id, planes_suscripcion(nombre, precio_mensual)')
        .eq('status', 'activo');

      const planCounts: Record<string, { cantidad: number; precio: number }> = {};
      suscriptoresPorPlan?.forEach((s: any) => {
        const planName = s.planes_suscripcion?.nombre || 'Sin plan';
        const precio = s.planes_suscripcion?.precio_mensual || 0;
        if (!planCounts[planName]) {
          planCounts[planName] = { cantidad: 0, precio };
        }
        planCounts[planName].cantidad++;
      });

      setSuscripcionesKPI({
        activos: activos || 0,
        nuevos: nuevos || 0,
        cancelados: cancelados || 0,
        churn: activos && activos > 0 ? ((cancelados || 0) / activos) * 100 : 0,
        mrr: pagos?.reduce((s, p) => s + (p.monto || 0), 0) || 0,
        desbloqueos: desbloqueos?.reduce((s, d) => s + (d.total || 0), 0) || 0,
        inventario: inventario?.reduce((s, i) => s + (i.total_venta || 0), 0) || 0,
        porPlan: Object.entries(planCounts).map(([plan, data]) => ({
          plan,
          cantidad: data.cantidad,
          ingreso: data.cantidad * data.precio,
        })),
      });

      // Fetch campañas KPIs
      const { data: campanas } = await supabase
        .from('campanas')
        .select('*')
        .order('fecha_inicio', { ascending: false })
        .limit(10);

      if (campanas) {
        const campanasConKPIs = await Promise.all(
          campanas.map(async (campana) => {
            const { data: leads } = await supabase
              .from('leads')
              .select('convertido, monto_venta')
              .eq('campana_id', campana.id);

            const { data: ventas } = await supabase
              .from('ventas_online')
              .select('total')
              .eq('campana_id', campana.id);

            const totalLeads = leads?.length || 0;
            const convertidos = leads?.filter(l => l.convertido).length || 0;
            const ventasLeads = leads?.filter(l => l.convertido && l.monto_venta).reduce((s, l) => s + (l.monto_venta || 0), 0) || 0;
            const ventasDirectas = ventas?.reduce((s, v) => s + (v.total || 0), 0) || 0;
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
    { id: 'eventos' as const, label: 'Eventos', icon: Calendar },
    { id: 'suscripciones' as const, label: 'Suscripciones', icon: Users },
    { id: 'online' as const, label: 'Campañas Online', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      
      {/* TABS */}
      <div className="flex gap-2 bg-stone-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-stone-300 border-t-amber-500"></div>
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
                  <div key={evento.id} className="bg-white border border-stone-200 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-stone-900">{evento.nombre}</h3>
                        <p className="text-sm text-stone-500">
                          {new Date(evento.fecha).toLocaleDateString('es-MX', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1 text-sm font-medium ${
                        evento.utilidad >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {evento.utilidad >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        ${evento.utilidad.toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <MiniStat label="Ventas" value={`$${evento.ventas.toLocaleString()}`} />
                      <MiniStat label="Gastos" value={`$${evento.gastos.toLocaleString()}`} />
                      <MiniStat label="Ticket Prom." value={`$${evento.ticketPromedio.toFixed(0)}`} />
                      <MiniStat label="Margen" value={`${evento.porcentajes.margen.toFixed(1)}%`} positive={evento.porcentajes.margen > 0} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-100">
                      <PercentBar label="Personal" value={evento.porcentajes.personal} color="bg-amber-400" />
                      <PercentBar label="Viáticos" value={evento.porcentajes.viaticos} color="bg-sky-400" />
                      <PercentBar label="Fee" value={evento.porcentajes.fee} color="bg-violet-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SUSCRIPCIONES TAB */}
          {activeTab === 'suscripciones' && suscripcionesKPI && (
            <div className="space-y-6">
              {/* Main KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPIBox 
                  icon={Users} 
                  label="Activos" 
                  value={suscripcionesKPI.activos.toString()}
                  color="emerald"
                />
                <KPIBox 
                  icon={ArrowUpRight} 
                  label="Nuevos (mes)" 
                  value={`+${suscripcionesKPI.nuevos}`}
                  color="sky"
                />
                <KPIBox 
                  icon={ArrowDownRight} 
                  label="Cancelados" 
                  value={suscripcionesKPI.cancelados.toString()}
                  color="red"
                />
                <KPIBox 
                  icon={Target} 
                  label="Churn Rate" 
                  value={`${suscripcionesKPI.churn.toFixed(1)}%`}
                  color="amber"
                />
              </div>

              {/* Ingresos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-stone-200 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                      <DollarSign size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-stone-500">MRR</p>
                      <p className="text-2xl font-bold text-stone-900">
                        ${suscripcionesKPI.mrr.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-stone-200 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-violet-100 rounded-xl">
                      <Zap size={20} className="text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm text-stone-500">Desbloqueos</p>
                      <p className="text-2xl font-bold text-stone-900">
                        ${suscripcionesKPI.desbloqueos.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-stone-200 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-sky-100 rounded-xl">
                      <ShoppingBag size={20} className="text-sky-600" />
                    </div>
                    <div>
                      <p className="text-sm text-stone-500">Inventario</p>
                      <p className="text-2xl font-bold text-stone-900">
                        ${suscripcionesKPI.inventario.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Por Plan */}
              {suscripcionesKPI.porPlan.length > 0 && (
                <div className="bg-white border border-stone-200 rounded-2xl p-6">
                  <h3 className="font-semibold text-stone-900 mb-4">Distribución por Plan</h3>
                  <div className="space-y-3">
                    {suscripcionesKPI.porPlan.map((item) => (
                      <div key={item.plan} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-stone-900">{item.plan}</span>
                          <span className="text-sm text-stone-500">{item.cantidad} subs</span>
                        </div>
                        <span className="font-semibold text-stone-900">
                          ${item.ingreso.toLocaleString()}/mes
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  <div key={campana.id} className="bg-white border border-stone-200 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-stone-900">{campana.nombre}</h3>
                        <span className="text-xs font-medium px-2 py-1 bg-violet-100 text-violet-700 rounded-full">
                          {campana.plataforma}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-stone-900">{campana.roas.toFixed(2)}x</p>
                        <p className="text-xs text-stone-500">ROAS</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <MiniStat label="Leads" value={campana.leads.toString()} />
                      <MiniStat label="Convertidos" value={campana.convertidos.toString()} />
                      <MiniStat label="Conversión" value={`${campana.conversion.toFixed(1)}%`} />
                      <MiniStat label="Gasto" value={`$${campana.gasto.toLocaleString()}`} />
                      <MiniStat label="CAC" value={`$${campana.cac.toFixed(0)}`} />
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

function MiniStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <p className="text-xs text-stone-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold ${positive === false ? 'text-red-600' : positive === true ? 'text-emerald-600' : 'text-stone-900'}`}>
        {value}
      </p>
    </div>
  );
}

function PercentBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-stone-500">{label}</span>
        <span className="font-medium text-stone-700">{value.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-stone-100 rounded-full h-2">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function KPIBox({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  color: 'emerald' | 'sky' | 'red' | 'amber';
}) {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-600',
    sky: 'bg-sky-100 text-sky-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <div className={`inline-flex p-2 rounded-xl ${colors[color]} mb-3`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="text-sm text-stone-500">{label}</p>
    </div>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
      <Icon size={48} className="mx-auto mb-4 text-stone-300" />
      <h3 className="font-semibold text-stone-900">{title}</h3>
      <p className="text-sm text-stone-500 mt-1">{description}</p>
    </div>
  );
}
