"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Download, 
  Plus, 
  Trash2, 
  Edit, 
  FileText, 
  Activity,
  CreditCard,
  Search,
  Save,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// --- COLORES Y ESTILOS ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// --- COMPONENTES AUXILIARES ---

// Tarjeta de KPI Simple
const KpiCard = ({ title, value, subtitle, icon: Icon, trend }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
      </div>
      <div className="p-2 bg-blue-50 rounded-lg">
        <Icon className="w-6 h-6 text-blue-600" />
      </div>
    </div>
    {subtitle && <p className="text-xs text-gray-400 mt-2">{subtitle}</p>}
    {trend && (
      <div className={`text-xs font-medium mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs mes anterior
      </div>
    )}
  </div>
);

// --- APP PRINCIPAL ---

export default function PosterShotManager() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'event', 'sub', 'finance'
  
  // ESTADO (DATOS) - Inicializamos con datos de ejemplo si está vacío
  const [events, setEvents] = useState([]);
  const [subs, setSubs] = useState([]);
  const [transactions, setTransactions] = useState([]); // Para finanzas (ingresos/egresos)

  // Cargar datos de LocalStorage al iniciar
  useEffect(() => {
    const savedEvents = localStorage.getItem('poster_events');
    const savedSubs = localStorage.getItem('poster_subs');
    const savedTrans = localStorage.getItem('poster_trans');
    
    if (savedEvents) setEvents(JSON.parse(savedEvents));
    if (savedSubs) setSubs(JSON.parse(savedSubs));
    if (savedTrans) setTransactions(JSON.parse(savedTrans));
  }, []);

  // Guardar datos cada vez que cambian
  useEffect(() => {
    localStorage.setItem('poster_events', JSON.stringify(events));
    localStorage.setItem('poster_subs', JSON.stringify(subs));
    localStorage.setItem('poster_trans', JSON.stringify(transactions));
  }, [events, subs, transactions]);

  // --- FORMULARIOS ---
  const [formData, setFormData] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const id = Date.now().toString(); // ID simple
    
    if (modalType === 'event') {
      const newEvent = { 
        id, 
        ...formData, 
        ingresoTotal: parseFloat(formData.ingresoTotal),
        gastos: parseFloat(formData.gastos),
        utilidad: parseFloat(formData.ingresoTotal) - parseFloat(formData.gastos)
      };
      setEvents([...events, newEvent]);
      // Agregar automáticamente al flujo financiero
      setTransactions([...transactions, {
        id: `t-${id}`,
        fecha: formData.fecha,
        tipo: 'Ingreso',
        categoria: 'Evento',
        descripcion: `Evento: ${formData.nombre}`,
        monto: parseFloat(formData.ingresoTotal)
      }, {
        id: `t-${id}-g`,
        fecha: formData.fecha,
        tipo: 'Egreso',
        categoria: 'Operativo Evento',
        descripcion: `Gastos Evento: ${formData.nombre}`,
        monto: parseFloat(formData.gastos)
      }]);
    } else if (modalType === 'sub') {
      setSubs([...subs, { id, ...formData, monto: parseFloat(formData.monto) }]);
    } else if (modalType === 'finance') {
      setTransactions([...transactions, { id, ...formData, monto: parseFloat(formData.monto) }]);
    }

    setShowModal(false);
    setFormData({});
  };

  const deleteItem = (type, id) => {
    if(!confirm("¿Estás seguro de eliminar este registro?")) return;
    if (type === 'event') setEvents(events.filter(i => i.id !== id));
    if (type === 'sub') setSubs(subs.filter(i => i.id !== id));
    if (type === 'trans') setTransactions(transactions.filter(i => i.id !== id));
  };

  const handleExport = () => {
    // Aquí iría la lógica real de exportación a Excel (usando librerías como XLSX)
    // Por ahora simulamos la acción.
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Tipo,Fecha,Concepto,Monto\n"
      + transactions.map(t => `${t.tipo},${t.fecha},${t.descripcion},${t.monto}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_financiero_postershot.csv");
    document.body.appendChild(link);
    link.click();
    alert("Reporte CSV descargado (Simulación de Excel)");
  };

  // --- CÁLCULOS PARA DASHBOARD ---
  const totalIngresos = transactions.filter(t => t.tipo === 'Ingreso').reduce((acc, curr) => acc + curr.monto, 0);
  const totalEgresos = transactions.filter(t => t.tipo === 'Egreso').reduce((acc, curr) => acc + curr.monto, 0);
  const utilidadNeta = totalIngresos - totalEgresos;
  
  const mrr = subs.filter(s => s.estado === 'Activo').reduce((acc, curr) => acc + curr.monto, 0);
  const totalSubs = subs.filter(s => s.estado === 'Activo').length;

  // Datos para gráficos
  const chartData = useMemo(() => {
    // Agrupar transacciones por mes para el gráfico principal
    const grouped = {};
    transactions.forEach(t => {
      const month = t.fecha.substring(0, 7); // YYYY-MM
      if (!grouped[month]) grouped[month] = { name: month, ingresos: 0, egresos: 0 };
      if (t.tipo === 'Ingreso') grouped[month].ingresos += t.monto;
      else grouped[month].egresos += t.monto;
    });
    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const sourceData = useMemo(() => {
    const sources = {};
    subs.forEach(s => {
      if (!sources[s.origen]) sources[s.origen] = 0;
      sources[s.origen] += 1;
    });
    return Object.keys(sources).map(k => ({ name: k, value: sources[k] }));
  }, [subs]);

  // --- RENDERIZADO DE VISTAS ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Ingresos Totales (YTD)" value={`$${totalIngresos.toLocaleString()}`} icon={DollarSign} trend={5} />
        <KpiCard title="Utilidad Neta" value={`$${utilidadNeta.toLocaleString()}`} icon={TrendingUp} subtitle={`${((utilidadNeta/totalIngresos)*100 || 0).toFixed(1)}% Margen`} />
        <KpiCard title="MRR (Suscripciones)" value={`$${mrr.toLocaleString()}`} icon={Users} subtitle={`${totalSubs} Suscriptores Activos`} />
        <KpiCard title="Eventos Realizados" value={events.length} icon={CalendarDays} subtitle="Este año" />
      </div>

      {/* Gráficos Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Flujo de Caja (Ingresos vs Egresos)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ingresos" fill="#3b82f6" name="Ingresos" />
                <Bar dataKey="egresos" fill="#ef4444" name="Egresos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Origen de Suscriptores</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEvents = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Eventos</h2>
        <button onClick={() => { setModalType('event'); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus size={20} /> Nuevo Evento
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Fecha</th>
              <th className="p-4 font-semibold text-gray-600">Evento</th>
              <th className="p-4 font-semibold text-gray-600">Ventas Totales</th>
              <th className="p-4 font-semibold text-gray-600">Gastos</th>
              <th className="p-4 font-semibold text-gray-600">Utilidad</th>
              <th className="p-4 font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">No hay eventos registrados. Carga tu primer reporte.</td></tr>
            ) : (
              events.map(ev => (
                <tr key={ev.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{ev.fecha}</td>
                  <td className="p-4 font-medium">{ev.nombre}</td>
                  <td className="p-4 text-green-600 font-bold">${parseFloat(ev.ingresoTotal).toLocaleString()}</td>
                  <td className="p-4 text-red-500">${parseFloat(ev.gastos).toLocaleString()}</td>
                  <td className="p-4 text-blue-600 font-bold">${ev.utilidad.toLocaleString()}</td>
                  <td className="p-4 flex gap-2">
                    <button className="p-2 text-gray-500 hover:text-blue-600"><Edit size={16} /></button>
                    <button onClick={() => deleteItem('event', ev.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSubs = () => (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Suscripciones & Leads</h2>
        <div className="flex gap-2">
          <button onClick={() => { setModalType('sub'); setShowModal(true); }} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
            <Plus size={20} /> Nueva Suscripción
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
          <p className="text-sm text-purple-600 font-semibold">Total Suscriptores</p>
          <p className="text-2xl font-bold text-purple-900">{totalSubs}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-600 font-semibold">Meta Ads (CPA Promedio)</p>
          <p className="text-2xl font-bold text-blue-900">$150.00 <span className="text-xs font-normal text-gray-500">(Ejemplo)</span></p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <p className="text-sm text-green-600 font-semibold">Retención</p>
          <p className="text-2xl font-bold text-green-900">92%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Nombre</th>
              <th className="p-4 font-semibold text-gray-600">Plan</th>
              <th className="p-4 font-semibold text-gray-600">Origen (Fuente)</th>
              <th className="p-4 font-semibold text-gray-600">Estado</th>
              <th className="p-4 font-semibold text-gray-600">Notas</th>
              <th className="p-4 font-semibold text-gray-600">Monto</th>
              <th className="p-4 font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {subs.map(s => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium">{s.nombre}</td>
                <td className="p-4">{s.plan}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.origen === 'Meta Ads' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {s.origen}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {s.estado}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-500 max-w-xs truncate" title={s.notas}>{s.notas}</td>
                <td className="p-4 font-bold">${parseFloat(s.monto).toLocaleString()}</td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => deleteItem('sub', s.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFinance = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Estado Financiero</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition border border-gray-300">
            <Download size={20} /> Exportar Excel
          </button>
          <button onClick={() => { setModalType('finance'); setShowModal(true); }} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
            <Plus size={20} /> Registrar Movimiento
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex justify-between">
          <span>Últimos Movimientos</span>
          <span className="text-sm font-normal text-gray-500">Historial completo</span>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-sm text-gray-500">
              <th className="p-3">Fecha</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Descripción</th>
              <th className="p-3 text-right">Monto</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).map(t => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{t.fecha}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${t.tipo === 'Ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {t.tipo}
                  </span>
                </td>
                <td className="p-3 text-gray-600">{t.categoria}</td>
                <td className="p-3 text-gray-800">{t.descripcion}</td>
                <td className={`p-3 text-right font-bold ${t.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.tipo === 'Ingreso' ? '+' : '-'}${t.monto.toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => deleteItem('trans', t.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-black text-blue-600 flex items-center gap-2">
            <Activity className="w-8 h-8" />
            PosterShot
          </h1>
          <p className="text-xs text-gray-400 mt-1 ml-1">Manager v1.0</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('events')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'events' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <CalendarDays size={20} /> Eventos
          </button>
          <button onClick={() => setActiveTab('subs')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'subs' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Users size={20} /> Suscriptores
          </button>
          <button onClick={() => setActiveTab('online')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'online' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <CreditCard size={20} /> Ventas Online
          </button>
          <button onClick={() => setActiveTab('finance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'finance' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <FileText size={20} /> Finanzas
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="bg-blue-600 rounded-xl p-4 text-white text-center">
            <p className="text-sm font-medium">Meta Anual</p>
            <div className="w-full bg-blue-800 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-white h-full" style={{ width: '45%' }}></div>
            </div>
            <p className="text-xs mt-2 opacity-80">45% completado</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800 capitalize">{activeTab === 'subs' ? 'Suscripciones' : activeTab}</h2>
          <div className="flex items-center gap-4">
            <div className="bg-gray-100 px-4 py-2 rounded-full flex items-center gap-2 text-gray-500">
              <Search size={18} />
              <input type="text" placeholder="Buscar..." className="bg-transparent outline-none text-sm" />
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
              JS
            </div>
          </div>
        </header>

        <main className="p-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'events' && renderEvents()}
          {activeTab === 'subs' && renderSubs()}
          {activeTab === 'finance' && renderFinance()}
          {activeTab === 'online' && <div className="text-center p-12 text-gray-500">Módulo de Ventas Online en construcción... 🚧</div>}
        </main>
      </div>

      {/* MODAL UNIVERSAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {modalType === 'event' && 'Registrar Evento'}
                {modalType === 'sub' && 'Nueva Suscripción'}
                {modalType === 'finance' && 'Nuevo Movimiento'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="date" name="fecha" required onChange={handleInputChange} className="w-full border p-2 rounded-lg" />
              
              {modalType === 'event' && (
                <>
                  <input placeholder="Nombre del Evento" name="nombre" required onChange={handleInputChange} className="w-full border p-2 rounded-lg" />
                  <input type="number" placeholder="Ingreso Total" name="ingresoTotal" required onChange={handleInputChange} className="w-full border p-2 rounded-lg" />
                  <input type="number" placeholder="Gastos Totales (Viáticos, Fee, Personal)" name="gastos" required onChange={handleInputChange} className="w-full border p-2 rounded-lg" />
                </>
              )}

              {modalType === 'sub' && (
                <>
                  <input placeholder="Nombre Cliente" name="nombre" required onChange={handleInputChange} className="w-full border p-2 rounded-lg" />
                  <select name="plan" onChange={handleInputChange} className="w-full border p-2 rounded-lg">
                    <option value="">Selecciona Plan</option>
                    <option value="Básico">Básico</option>
                    <option value="Pro">Pro</option>
                    <option value="Elite">Elite</option>
                  </select>
                  <select name="origen" onChange={handleInputChange} className="w-full border p-2 rounded-lg">
                    <option value="">Fuente de Adquisición</option>
                    <option value="Meta Ads">Meta Ads</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Orgánico/Evento">Orgánico / En Evento</option>
                    <option value="Referido">Referido</option>
                  </select>
                  <input type="number" placeholder="Monto Mensual" name="monto" required onChange={handleInputChange} className="w-full border p-2 rounded-lg" />
                  <textarea placeholder="Notas (Campaña específica, detalles...)" name="notas" onChange={handleInputChange} className="w-full border p-2 rounded-lg h-20"></textarea>
                  <select name="estado" onChange={handleInputChange} className="w-full border p-2 rounded-lg">
                    <option value="Activo">Activo</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </>
              )}

              {modalType === 'finance' && (
                <>
                  <select name="tipo" onChange={handleInputChange} className="w-full border p-2 rounded-lg">
                    <option value="Ingreso">Ingreso</option>
                    <option value="Egreso">Egreso</option>
                  </select>
                  <input placeholder="Categoría (Nómina, Software, Oficina...)" name="categoria" onChange={handleInputChange} className="w-full border p-2 rounded-lg" />
                  <input placeholder="Descripción" name="descripcion" required onChange={handleInputChange} className="w-full border p-2 rounded-lg" />
                  <input type="number" placeholder="Monto" name="monto" required onChange={handleInputChange} className="w-full border p-2 rounded-lg" />
                </>
              )}

              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}