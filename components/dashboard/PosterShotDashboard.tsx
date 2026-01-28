'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Menu, 
  LayoutDashboard, 
  BarChart2, 
  Calendar as CalendarIcon, 
  FileSpreadsheet, 
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
} from 'lucide-react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import FinancesView from '@/components/finances/FinancesView';
import KPIsView from '@/components/kpis/KPIsView';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface DashboardData {
  ventasMes: number;
  egresosMes: number;
  cuotaVentas: number;
  suscriptoresActivos: number;
  suscriptoresNuevos: number;
  cuotaSuscriptores: number;
}

interface ChartDataPoint {
  name: string;
  mes: number;
  ingresos: number;
  egresos: number;
  meta: number;
}

export default function PosterShotDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [timeRange, setTimeRange] = useState<'Mensual' | 'Trimestral' | 'Anual'>('Mensual');
  
  const currentDate = new Date();
  const [selectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      try {
        // 1. Cuotas del año
        const { data: cuotas } = await supabase
          .from('cuotas_mensuales')
          .select('*')
          .eq('anio', selectedYear);

        const cuotaMes = cuotas?.find((c: any) => c.mes === selectedMonth);

        // 2. Fechas del mes seleccionado
        const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

        // 3. Ventas del mes (eventos + online)
        const { data: ventasEventos } = await supabase
          .from('ventas_evento')
          .select('total')
          .gte('fecha', startDate)
          .lte('fecha', endDate);

        const { data: ventasOnline } = await supabase
          .from('ventas_online')
          .select('total')
          .gte('fecha', startDate)
          .lte('fecha', endDate);

        const totalVentas = 
          (ventasEventos?.reduce((s: number, v: any) => s + (v.total || 0), 0) || 0) +
          (ventasOnline?.reduce((s: number, v: any) => s + (v.total || 0), 0) || 0);

        // 4. Egresos del mes
        const { data: gastosEventos } = await supabase
          .from('gastos_evento')
          .select('monto')
          .gte('fecha', startDate)
          .lte('fecha', endDate);

        const totalEgresos = gastosEventos?.reduce((s: number, g: any) => s + (g.monto || 0), 0) || 0;

        // 5. Suscriptores
        const { count: suscriptoresActivos } = await supabase
          .from('suscriptores')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'activo');

        const { count: suscriptoresNuevos } = await supabase
          .from('suscriptores')
          .select('*', { count: 'exact', head: true })
          .gte('fecha_inicio', startDate)
          .lte('fecha_inicio', endDate);

        setDashboardData({
          ventasMes: totalVentas,
          egresosMes: totalEgresos,
          cuotaVentas: cuotaMes?.cuota_venta || 0,
          suscriptoresActivos: suscriptoresActivos || 0,
          suscriptoresNuevos: suscriptoresNuevos || 0,
          cuotaSuscriptores: cuotaMes?.cuota_suscripciones || 0,
        });

        // 6. Datos para la gráfica anual
        const chartPoints: ChartDataPoint[] = [];
        
        for (let mes = 1; mes <= 12; mes++) {
          const mesStart = `${selectedYear}-${String(mes).padStart(2, '0')}-01`;
          const mesLastDay = new Date(selectedYear, mes, 0).getDate();
          const mesEnd = `${selectedYear}-${String(mes).padStart(2, '0')}-${mesLastDay}`;

          const { data: ventasE } = await supabase
            .from('ventas_evento')
            .select('total')
            .gte('fecha', mesStart)
            .lte('fecha', mesEnd);

          const { data: ventasO } = await supabase
            .from('ventas_online')
            .select('total')
            .gte('fecha', mesStart)
            .lte('fecha', mesEnd);

          const { data: gastosE } = await supabase
            .from('gastos_evento')
            .select('monto')
            .gte('fecha', mesStart)
            .lte('fecha', mesEnd);

          const ingresos = 
            (ventasE?.reduce((s: number, v: any) => s + (v.total || 0), 0) || 0) +
            (ventasO?.reduce((s: number, v: any) => s + (v.total || 0), 0) || 0);

          const egresos = gastosE?.reduce((s: number, g: any) => s + (g.monto || 0), 0) || 0;

          const cuota = cuotas?.find((c: any) => c.mes === mes);

          chartPoints.push({
            name: MONTHS[mes - 1],
            mes,
            ingresos,
            egresos,
            meta: cuota?.cuota_venta || 0,
          });
        }

        setChartData(chartPoints);

      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedYear, selectedMonth]);

  // Calcular utilidad
  const utilidad = dashboardData ? dashboardData.ventasMes - dashboardData.egresosMes : 0;
  const margen = dashboardData && dashboardData.ventasMes > 0 
    ? (utilidad / dashboardData.ventasMes) * 100 
    : 0;

  // Porcentaje de avance de ventas
  const avanceVentas = dashboardData && dashboardData.cuotaVentas > 0
    ? (dashboardData.ventasMes / dashboardData.cuotaVentas) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex">
      
      {/* SIDEBAR - Estilo Stripe */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-gray-900 
        transition-all duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'w-60' : 'w-16'}
      `}>
        {/* Logo */}
        <div className={`h-14 flex items-center border-b border-gray-800 ${sidebarOpen ? 'px-4' : 'justify-center'}`}>
          {sidebarOpen ? (
            <span className="font-semibold text-white tracking-tight">
              PosterShot
            </span>
          ) : (
            <span className="font-bold text-white text-lg">P</span>
          )}
        </div>
        
        {/* Nav */}
        <nav className="flex-1 py-4">
          <NavItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeSection === 'Dashboard'} 
            onClick={() => setActiveSection('Dashboard')}
            collapsed={!sidebarOpen}
          />
          <NavItem 
            icon={BarChart2} 
            label="KPI's" 
            active={activeSection === 'KPIs'} 
            onClick={() => setActiveSection('KPIs')}
            collapsed={!sidebarOpen}
          />
          <NavItem 
            icon={FileSpreadsheet} 
            label="Finanzas" 
            active={activeSection === 'Finanzas'} 
            onClick={() => setActiveSection('Finanzas')}
            collapsed={!sidebarOpen}
          />
          <NavItem 
            icon={CalendarIcon} 
            label="Calendario" 
            active={activeSection === 'Calendario'} 
            onClick={() => setActiveSection('Calendario')}
            collapsed={!sidebarOpen}
          />
        </nav>

        {/* Toggle */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-12 flex items-center justify-center border-t border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={18} className={`transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* MAIN */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-60' : 'ml-16'}`}>
        
        {/* HEADER */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-gray-900">{activeSection}</h1>
          </div>
          
          {activeSection === 'Dashboard' && (
            <div className="flex items-center gap-3">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m} {selectedYear}</option>
                ))}
              </select>

              <div className="flex bg-gray-100 rounded-md p-0.5">
                {(['Mensual', 'Trimestral', 'Anual'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                      timeRange === range 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* CONTENT */}
        <main className="p-6">
          
          {activeSection === 'Dashboard' && (
            <div className="space-y-6">
              
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* KPI CARDS - Solo 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Ventas */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <DollarSign size={18} className="text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-600">Ventas del Mes</span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          avanceVentas >= 100 ? 'bg-green-100 text-green-700' : 
                          avanceVentas >= 50 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {avanceVentas.toFixed(0)}%
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <span className="text-2xl font-bold text-gray-900">
                          ${dashboardData?.ventasMes.toLocaleString() || 0}
                        </span>
                        <span className="text-sm text-gray-400 ml-2">
                          / ${dashboardData?.cuotaVentas.toLocaleString() || 0}
                        </span>
                      </div>

                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div 
                          className="h-full rounded-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${Math.min(avanceVentas, 100)}%` }}
                        />
                      </div>

                      <p className="text-xs text-gray-500 mt-3">
                        Faltan ${((dashboardData?.cuotaVentas || 0) - (dashboardData?.ventasMes || 0)).toLocaleString()} para la meta
                      </p>
                    </div>

                    {/* Suscriptores */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-green-50 rounded-lg">
                            <Users size={18} className="text-green-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-600">Suscriptores</span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                          +{dashboardData?.suscriptoresNuevos || 0} nuevos
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <span className="text-2xl font-bold text-gray-900">
                          {dashboardData?.suscriptoresActivos || 0}
                        </span>
                        <span className="text-sm text-gray-400 ml-2">
                          activos / meta: {dashboardData?.cuotaSuscriptores || 0}
                        </span>
                      </div>

                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div 
                          className="h-full rounded-full bg-green-600 transition-all duration-500"
                          style={{ width: `${Math.min(((dashboardData?.suscriptoresActivos || 0) / (dashboardData?.cuotaSuscriptores || 1)) * 100, 100)}%` }}
                        />
                      </div>

                      <p className="text-xs text-gray-500 mt-3">
                        Meta acumulada del mes: {dashboardData?.cuotaSuscriptores || 0} suscriptores
                      </p>
                    </div>
                  </div>

                  {/* UTILIDAD */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard 
                      label="Ingresos" 
                      value={`$${dashboardData?.ventasMes.toLocaleString() || 0}`}
                      icon={TrendingUp}
                      color="blue"
                    />
                    <StatCard 
                      label="Egresos" 
                      value={`$${dashboardData?.egresosMes.toLocaleString() || 0}`}
                      icon={TrendingDown}
                      color="red"
                    />
                    <StatCard 
                      label="Utilidad" 
                      value={`$${utilidad.toLocaleString()}`}
                      subtitle={`${margen.toFixed(1)}% margen`}
                      icon={Target}
                      color={utilidad >= 0 ? 'green' : 'red'}
                    />
                  </div>

                  {/* GRÁFICA */}
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="font-semibold text-gray-900">Ingresos vs Egresos</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Comparativa mensual {selectedYear}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-blue-600 rounded"></div>
                          Ingresos
                        </span>
                        <span className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-red-400 rounded"></div>
                          Egresos
                        </span>
                        <span className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-amber-400 rounded-full"></div>
                          Meta
                        </span>
                      </div>
                    </div>
                    
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{top: 5, right: 5, left: -15, bottom: 5}}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#64748b', fontSize: 11}} 
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#64748b', fontSize: 11}} 
                            tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            contentStyle={{
                              borderRadius: '8px', 
                              border: '1px solid #e2e8f0', 
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                              fontSize: '12px',
                            }}
                            formatter={(value: any) => [`$${Number(value || 0).toLocaleString()}`, '']}
                          />
                          <Bar dataKey="ingresos" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={16} name="Ingresos" />
                          <Bar dataKey="egresos" fill="#f87171" radius={[4, 4, 0, 0]} barSize={16} name="Egresos" />
                          <Line 
                            type="monotone" 
                            dataKey="meta" 
                            stroke="#f59e0b" 
                            strokeWidth={2} 
                            strokeDasharray="5 5"
                            dot={false}
                            name="Meta"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'Finanzas' && <FinancesView />}
          {activeSection === 'KPIs' && <KPIsView />}
          
          {activeSection === 'Calendario' && (
            <div className="flex flex-col items-center justify-center h-80 bg-white border border-gray-200 rounded-lg">
              <CalendarIcon size={40} className="text-gray-300 mb-3" />
              <p className="font-medium text-gray-600">Calendario</p>
              <p className="text-sm text-gray-400 mt-1">Próximamente: Conexión con Google Calendar</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTES
// ============================================================

function NavItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  collapsed 
}: { 
  icon: React.ElementType; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  collapsed: boolean;
}) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all
        ${active 
          ? 'text-white bg-gray-800' 
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        }
        ${collapsed ? 'justify-center' : ''}
      `}
      title={collapsed ? label : undefined}
    >
      <Icon size={18} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

function StatCard({ 
  label, 
  value, 
  subtitle,
  icon: Icon,
  color 
}: { 
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: 'blue' | 'red' | 'green' | 'amber';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-md ${colors[color]}`}>
          <Icon size={14} />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
