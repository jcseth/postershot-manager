'use client';

import React, { useState, useMemo } from 'react';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  BarChart2, 
  Calendar as CalendarIcon, 
  FileSpreadsheet, 
  BrainCircuit, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Zap,
  Package,
  ShoppingCart
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
} from 'recharts';
import { useFinancialData, useChartData } from '@/hooks/useFinancialData';
import FinancesView from '@/components/finances/FinancesView';
import KPIsView from '@/components/kpis/KPIsView';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function PosterShotDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [timeRange, setTimeRange] = useState<'Mensual' | 'Trimestral' | 'Anual'>('Mensual');
  
  const currentDate = new Date();
  const [selectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  const { kpis, cuotas, loading } = useFinancialData(selectedYear, selectedMonth);
  const { data: chartData, loading: chartLoading } = useChartData(selectedYear);

  // Calcular KPIs según el rango de tiempo
  const displayKpis = useMemo(() => {
    if (!kpis || !cuotas.length) return null;

    if (timeRange === 'Mensual') {
      return {
        ventas: kpis.ventasReales,
        cuotaVentas: kpis.cuotaVentas,
        suscriptores: kpis.suscriptoresActivos,
        cuotaSuscriptores: kpis.cuotaSuscriptores,
      };
    }

    if (timeRange === 'Trimestral') {
      const quarterStart = Math.floor((selectedMonth - 1) / 3) * 3;
      const quarterCuotas = cuotas.filter(c => c.mes > quarterStart && c.mes <= quarterStart + 3);
      const cuotaVentasTrimestre = quarterCuotas.reduce((s, c) => s + c.cuota_venta, 0);
      const cuotaSubsTrimestre = quarterCuotas[quarterCuotas.length - 1]?.cuota_suscripciones || 0;
      
      return {
        ventas: kpis.ventasReales, // TODO: Sumar trimestre completo
        cuotaVentas: cuotaVentasTrimestre,
        suscriptores: kpis.suscriptoresActivos,
        cuotaSuscriptores: cuotaSubsTrimestre,
      };
    }

    // Anual
    const cuotaAnual = cuotas.reduce((s, c) => s + c.cuota_venta, 0);
    return {
      ventas: kpis.ventasReales, // TODO: Sumar año completo
      cuotaVentas: cuotaAnual,
      suscriptores: kpis.suscriptoresActivos,
      cuotaSuscriptores: 53,
    };
  }, [kpis, cuotas, timeRange, selectedMonth]);

  const totalIngresosMes = kpis ? 
    Object.values(kpis.ingresosMes).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-stone-900 text-stone-100
        transition-all duration-300 flex flex-col
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}
        lg:static lg:translate-x-0 ${!sidebarOpen && 'lg:hidden'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-stone-800">
          <span className="font-semibold text-lg tracking-tight">
            PosterShot<span className="text-amber-400">.ctrl</span>
          </span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-stone-400 hover:text-white">
            <X size={20}/>
          </button>
        </div>
        
        <nav className="p-4 space-y-1 flex-1">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeSection === 'Dashboard'} 
            onClick={() => setActiveSection('Dashboard')} 
          />
          
          <div className="pt-8 pb-3">
            <p className="px-3 text-[10px] font-semibold text-stone-500 uppercase tracking-widest">Gestión</p>
          </div>
          
          <SidebarItem 
            icon={BarChart2} 
            label="KPIs Detallados" 
            active={activeSection === 'KPIs'} 
            onClick={() => setActiveSection('KPIs')} 
          />
          <SidebarItem 
            icon={FileSpreadsheet} 
            label="Finanzas & Excel" 
            active={activeSection === 'Finanzas'} 
            onClick={() => setActiveSection('Finanzas')} 
          />
          <SidebarItem 
            icon={CalendarIcon} 
            label="Eventos" 
            active={activeSection === 'Eventos'} 
            onClick={() => setActiveSection('Eventos')} 
          />
          
          <div className="pt-8 pb-3">
            <p className="px-3 text-[10px] font-semibold text-stone-500 uppercase tracking-widest">Futuro</p>
          </div>
          
          <SidebarItem 
            icon={BrainCircuit} 
            label="Aura AI" 
            active={activeSection === 'ML'} 
            onClick={() => setActiveSection('ML')} 
            disabled
          />
        </nav>

        <div className="p-4 border-t border-stone-800">
          <div className="px-3 py-2 bg-stone-800/50 rounded-lg">
            <p className="text-[10px] text-stone-500 uppercase tracking-wider">Periodo</p>
            <p className="text-sm font-medium text-stone-300">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-stone-600 hover:text-stone-900">
                <Menu size={20}/>
              </button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-stone-900">{activeSection}</h1>
              <p className="text-xs text-stone-500">Sistema de Control Financiero</p>
            </div>
          </div>
          
          {activeSection === 'Dashboard' && (
            <div className="flex items-center gap-4">
              {/* Selector de mes */}
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-sm bg-stone-100 border-0 rounded-lg px-3 py-2 text-stone-700 focus:ring-2 focus:ring-amber-400"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>

              {/* Selector de rango */}
              <div className="flex bg-stone-100 rounded-lg p-1">
                {(['Mensual', 'Trimestral', 'Anual'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                      timeRange === range 
                        ? 'bg-white text-stone-900 shadow-sm' 
                        : 'text-stone-500 hover:text-stone-700'
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
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          
          {activeSection === 'Dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-stone-300 border-t-amber-500"></div>
                </div>
              ) : (
                <>
                  {/* KPI CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                      title="Ventas"
                      subtitle={timeRange}
                      value={displayKpis?.ventas || 0}
                      target={displayKpis?.cuotaVentas || 0}
                      format="money"
                      icon={DollarSign}
                      color="amber"
                    />
                    <KPICard
                      title="Suscriptores"
                      subtitle="Activos"
                      value={displayKpis?.suscriptores || 0}
                      target={displayKpis?.cuotaSuscriptores || 0}
                      format="number"
                      icon={Users}
                      color="emerald"
                    />
                    <KPICard
                      title="Desbloqueos"
                      subtitle="Este mes"
                      value={kpis?.ingresosMes.desbloqueos || 0}
                      format="money"
                      icon={Zap}
                      color="violet"
                    />
                    <KPICard
                      title="Inventario"
                      subtitle="Ventas a subs"
                      value={kpis?.ingresosMes.inventario || 0}
                      format="money"
                      icon={Package}
                      color="sky"
                    />
                  </div>

                  {/* CHART + BREAKDOWN */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Chart */}
                    <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="font-semibold text-stone-900">Ingresos vs Meta</h3>
                          <p className="text-sm text-stone-500 mt-1">Progreso mensual {selectedYear}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                            Meta
                          </span>
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-stone-800 rounded"></div>
                            Ingresos
                          </span>
                        </div>
                      </div>
                      
                      <div className="h-72">
                        {chartLoading ? (
                          <div className="h-full flex items-center justify-center">
                            <div className="animate-pulse text-stone-400">Cargando gráfica...</div>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{top: 10, right: 10, left: -10, bottom: 0}}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                              <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#78716c', fontSize: 12}} 
                                dy={10} 
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#78716c', fontSize: 11}} 
                                tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`}
                                width={50}
                              />
                              <Tooltip 
                                contentStyle={{
                                  borderRadius: '12px', 
                                  border: 'none', 
                                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                                  fontSize: '12px',
                                  padding: '12px 16px'
                                }}
                                formatter={(value: number, name: string) => [
                                  `$${value.toLocaleString()}`, 
                                  name === 'meta' ? 'Meta' : 'Ingresos'
                                ]}
                              />
                              <Bar 
                                dataKey="ingresos" 
                                fill="#1c1917" 
                                radius={[6, 6, 0, 0]} 
                                barSize={20}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="meta" 
                                stroke="#f59e0b" 
                                strokeWidth={3} 
                                dot={{r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff'}} 
                                activeDot={{r: 6}}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="bg-white border border-stone-200 rounded-2xl p-6">
                      <h3 className="font-semibold text-stone-900 mb-6">Desglose del Mes</h3>
                      
                      <div className="space-y-4">
                        <BreakdownItem 
                          label="Eventos" 
                          value={kpis?.ingresosMes.eventos || 0}
                          total={totalIngresosMes}
                          color="bg-stone-800"
                        />
                        <BreakdownItem 
                          label="Suscripciones" 
                          value={kpis?.ingresosMes.suscripciones || 0}
                          total={totalIngresosMes}
                          color="bg-emerald-500"
                        />
                        <BreakdownItem 
                          label="Desbloqueos" 
                          value={kpis?.ingresosMes.desbloqueos || 0}
                          total={totalIngresosMes}
                          color="bg-violet-500"
                        />
                        <BreakdownItem 
                          label="Online" 
                          value={kpis?.ingresosMes.online || 0}
                          total={totalIngresosMes}
                          color="bg-amber-500"
                        />
                        <BreakdownItem 
                          label="Inventario" 
                          value={kpis?.ingresosMes.inventario || 0}
                          total={totalIngresosMes}
                          color="bg-sky-500"
                        />
                      </div>

                      <div className="mt-6 pt-6 border-t border-stone-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-stone-600">Total Ingresos</span>
                          <span className="text-xl font-bold text-stone-900">
                            ${totalIngresosMes.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QUICK STATS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickStat 
                      label="Ticket Promedio" 
                      value="$0" 
                      change={null}
                    />
                    <QuickStat 
                      label="Churn Rate" 
                      value="0%" 
                      change={null}
                    />
                    <QuickStat 
                      label="MRR" 
                      value={`$${(kpis?.ingresosMes.suscripciones || 0).toLocaleString()}`}
                      change={null}
                    />
                    <QuickStat 
                      label="CAC Promedio" 
                      value="$0" 
                      change={null}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'Finanzas' && <FinancesView />}
          {activeSection === 'KPIs' && <KPIsView />}
          
          {activeSection === 'Eventos' && (
            <div className="flex flex-col items-center justify-center h-96 text-stone-400">
              <CalendarIcon size={48} className="mb-4 opacity-30" />
              <p className="font-medium">Calendario de Eventos</p>
              <p className="text-sm mt-1">Próximamente: Conexión con Google Calendar</p>
            </div>
          )}
          
          {activeSection === 'ML' && (
            <div className="flex flex-col items-center justify-center h-96 text-stone-400">
              <BrainCircuit size={48} className="mb-4 opacity-30" />
              <p className="font-medium">Aura AI</p>
              <p className="text-sm mt-1">Módulo de predicciones en desarrollo</p>
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

function SidebarItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  disabled 
}: { 
  icon: React.ElementType; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
        ${active 
          ? 'bg-amber-400/10 text-amber-400' 
          : disabled
            ? 'text-stone-600 cursor-not-allowed'
            : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
        }
      `}
    >
      <Icon size={18} className={active ? 'text-amber-400' : ''} />
      <span>{label}</span>
      {active && <ChevronRight size={14} className="ml-auto text-amber-400/60"/>}
    </button>
  );
}

function KPICard({ 
  title, 
  subtitle, 
  value, 
  target, 
  format, 
  icon: Icon,
  color 
}: { 
  title: string;
  subtitle: string;
  value: number;
  target?: number;
  format: 'money' | 'number';
  icon: React.ElementType;
  color: 'amber' | 'emerald' | 'violet' | 'sky';
}) {
  const percentage = target ? Math.min(100, Math.max(0, (value / target) * 100)) : null;
  const formatted = format === 'money' ? `$${value.toLocaleString()}` : value.toLocaleString();
  
  const colorClasses = {
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
  };

  const barColors = {
    amber: 'bg-amber-400',
    emerald: 'bg-emerald-500',
    violet: 'bg-violet-500',
    sky: 'bg-sky-500',
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 hover:shadow-lg hover:shadow-stone-200/50 transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl border ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        {percentage !== null && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${colorClasses[color]}`}>
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>
      
      <div>
        <p className="text-sm text-stone-500">{title}</p>
        <p className="text-2xl font-bold text-stone-900 mt-1">{formatted}</p>
        {target !== undefined && (
          <p className="text-xs text-stone-400 mt-1">
            Meta: {format === 'money' ? `$${target.toLocaleString()}` : target}
          </p>
        )}
      </div>

      {percentage !== null && (
        <div className="mt-4">
          <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${barColors[color]}`} 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function BreakdownItem({ 
  label, 
  value, 
  total, 
  color 
}: { 
  label: string; 
  value: number; 
  total: number; 
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-stone-600">{label}</span>
        <span className="text-sm font-semibold text-stone-900">${value.toLocaleString()}</span>
      </div>
      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function QuickStat({ 
  label, 
  value, 
  change 
}: { 
  label: string; 
  value: string; 
  change: number | null;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <p className="text-xs text-stone-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <span className="text-xl font-bold text-stone-900">{value}</span>
        {change !== null && (
          <span className={`flex items-center text-xs font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
}
