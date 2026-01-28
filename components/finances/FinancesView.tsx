'use client';

import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Eye,
  X,
  Loader2,
  FileText
} from 'lucide-react';
import { useArchivosSubidos } from '@/hooks/useFinancialData';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

type FileType = 'evento' | 'suscripciones' | 'campana_online';

interface ParsedData {
  tipo: FileType;
  info: Record<string, unknown>;
  registros: Record<string, unknown>[];
  resumen: {
    totalRegistros: number;
    preview: string[];
  };
}

export default function FinancesView() {
  const { archivos, loading, refetch, eliminarArchivo } = useArchivosSubidos();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ParsedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const detectFileType = (sheetNames: string[]): FileType | null => {
    if (sheetNames.includes('INFO_EVENTO') && sheetNames.includes('VENTAS')) return 'evento';
    if (sheetNames.includes('SUSCRIPTORES') && sheetNames.includes('PAGOS_MENSUALIDAD')) return 'suscripciones';
    if (sheetNames.includes('INFO_CAMPAÑA') && sheetNames.includes('LEADS')) return 'campana_online';
    return null;
  };

  const parseExcel = useCallback(async (file: File): Promise<ParsedData | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const tipo = detectFileType(workbook.SheetNames);
          if (!tipo) {
            reject(new Error('Formato de archivo no reconocido. Usa las plantillas oficiales.'));
            return;
          }

          let info: Record<string, unknown> = {};
          let registros: Record<string, unknown>[] = [];
          let preview: string[] = [];

          if (tipo === 'evento') {
            // Parsear INFO_EVENTO
            const infoSheet = XLSX.utils.sheet_to_json(workbook.Sheets['INFO_EVENTO'], { header: 1 }) as unknown[][];
            info = {
              nombre: infoSheet[2]?.[1] || '',
              deporte: infoSheet[3]?.[1] || '',
              fecha_inicio: infoSheet[4]?.[1] || '',
              fecha_fin: infoSheet[5]?.[1] || '',
              ubicacion: infoSheet[6]?.[1] || '',
              participantes: infoSheet[7]?.[1] || 0,
              fee: infoSheet[8]?.[1] || 0,
            };

            // Parsear VENTAS
            const ventasSheet = XLSX.utils.sheet_to_json(workbook.Sheets['VENTAS']) as Record<string, unknown>[];
            const ventas = ventasSheet.filter(row => row['Fecha'] && row['Total']);
            
            // Parsear GASTOS
            const gastosSheet = XLSX.utils.sheet_to_json(workbook.Sheets['GASTOS']) as Record<string, unknown>[];
            const gastos = gastosSheet.filter(row => row['Fecha'] && row['Monto']);

            registros = [...ventas.map(v => ({ ...v, _tipo: 'venta' })), ...gastos.map(g => ({ ...g, _tipo: 'gasto' }))];
            preview = [
              `Evento: ${info.nombre}`,
              `Ventas: ${ventas.length} registros`,
              `Gastos: ${gastos.length} registros`,
            ];
          }

          if (tipo === 'suscripciones') {
            const subsSheet = XLSX.utils.sheet_to_json(workbook.Sheets['SUSCRIPTORES']) as Record<string, unknown>[];
            const pagosSheet = XLSX.utils.sheet_to_json(workbook.Sheets['PAGOS_MENSUALIDAD']) as Record<string, unknown>[];
            const desbSheet = XLSX.utils.sheet_to_json(workbook.Sheets['DESBLOQUEOS']) as Record<string, unknown>[];
            const invSheet = XLSX.utils.sheet_to_json(workbook.Sheets['VENTA_INVENTARIO']) as Record<string, unknown>[];

            const subs = subsSheet.filter(row => row['Nombre']);
            const pagos = pagosSheet.filter(row => row['Suscriptor (Nombre)']);
            const desbloqueos = desbSheet.filter(row => row['Suscriptor (Nombre)']);
            const inventario = invSheet.filter(row => row['Suscriptor']);

            registros = [
              ...subs.map(s => ({ ...s, _tipo: 'suscriptor' })),
              ...pagos.map(p => ({ ...p, _tipo: 'pago' })),
              ...desbloqueos.map(d => ({ ...d, _tipo: 'desbloqueo' })),
              ...inventario.map(i => ({ ...i, _tipo: 'inventario' })),
            ];

            preview = [
              `Suscriptores: ${subs.length}`,
              `Pagos: ${pagos.length}`,
              `Desbloqueos: ${desbloqueos.length}`,
              `Inventario: ${inventario.length}`,
            ];
          }

          if (tipo === 'campana_online') {
            const infoSheet = XLSX.utils.sheet_to_json(workbook.Sheets['INFO_CAMPAÑA'], { header: 1 }) as unknown[][];
            info = {
              nombre: infoSheet[2]?.[1] || '',
              tipo_campana: infoSheet[3]?.[1] || '',
              plataforma: infoSheet[4]?.[1] || '',
              fecha_inicio: infoSheet[5]?.[1] || '',
              fecha_fin: infoSheet[6]?.[1] || '',
              presupuesto: infoSheet[7]?.[1] || 0,
              gasto_real: infoSheet[8]?.[1] || 0,
            };

            const leadsSheet = XLSX.utils.sheet_to_json(workbook.Sheets['LEADS']) as Record<string, unknown>[];
            const ventasSheet = XLSX.utils.sheet_to_json(workbook.Sheets['VENTAS_ONLINE']) as Record<string, unknown>[];

            const leads = leadsSheet.filter(row => row['Fecha']);
            const ventas = ventasSheet.filter(row => row['Fecha']);

            registros = [
              ...leads.map(l => ({ ...l, _tipo: 'lead' })),
              ...ventas.map(v => ({ ...v, _tipo: 'venta_online' })),
            ];

            preview = [
              `Campaña: ${info.nombre}`,
              `Leads: ${leads.length}`,
              `Ventas: ${ventas.length}`,
            ];
          }

          resolve({
            tipo,
            info,
            registros,
            resumen: {
              totalRegistros: registros.length,
              preview,
            },
          });
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Error leyendo el archivo'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const parsed = await parseExcel(file);
      setPreview(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando archivo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleConfirmUpload = async () => {
    if (!preview) return;

    setUploading(true);
    setError(null);

    try {
      // Guardar en Supabase según el tipo
      if (preview.tipo === 'evento') {
        // 1. Crear evento
        const { data: evento, error: eventoError } = await supabase
          .from('eventos')
          .insert({
            nombre: preview.info.nombre as string,
            deporte: preview.info.deporte as string,
            fecha_inicio: formatDate(preview.info.fecha_inicio),
            fecha_fin: formatDate(preview.info.fecha_fin),
            ubicacion: preview.info.ubicacion as string,
            participantes_aprox: Number(preview.info.participantes) || null,
            fee_entrada: Number(preview.info.fee) || 0,
            status: 'finalizado',
          })
          .select()
          .single();

        if (eventoError) throw eventoError;

        // 2. Insertar ventas
        const ventas = preview.registros
          .filter(r => r._tipo === 'venta')
          .map(v => ({
            evento_id: evento.id,
            fecha: formatDate(v['Fecha']),
            cliente: v['Cliente'] as string || null,
            producto_nombre: v['Producto'] as string,
            precio_unitario: Number(v['Precio Unitario']) || 0,
            cantidad: Number(v['Cantidad']) || 1,
            total: Number(v['Total']) || 0,
            metodo_pago: (v['Método Pago'] as string)?.toLowerCase() || 'efectivo',
            notas: v['Notas'] as string || null,
          }));

        if (ventas.length > 0) {
          const { error: ventasError } = await supabase.from('ventas_evento').insert(ventas);
          if (ventasError) throw ventasError;
        }

        // 3. Insertar gastos
        const gastos = preview.registros
          .filter(r => r._tipo === 'gasto')
          .map(g => ({
            evento_id: evento.id,
            fecha: formatDate(g['Fecha']),
            categoria: (g['Categoría'] as string)?.toLowerCase() || 'otros',
            concepto: g['Concepto'] as string || '',
            monto: Number(g['Monto']) || 0,
            metodo_pago: (g['Método Pago'] as string)?.toLowerCase() || null,
            notas: g['Notas'] as string || null,
          }));

        if (gastos.length > 0) {
          const { error: gastosError } = await supabase.from('gastos_evento').insert(gastos);
          if (gastosError) throw gastosError;
        }

        // 4. Registrar archivo subido
        await supabase.from('archivos_subidos').insert({
          nombre_archivo: `EVENTO_${preview.info.nombre}`,
          tipo: 'evento',
          evento_id: evento.id,
          registros_procesados: preview.resumen.totalRegistros,
          status: 'procesado',
          datos_json: preview as unknown as Record<string, unknown>,
        });
      }

      if (preview.tipo === 'suscripciones') {
        // Procesar suscriptores
        const suscriptores = preview.registros.filter(r => r._tipo === 'suscriptor');
        
        for (const sub of suscriptores) {
          // Buscar plan
          const { data: plan } = await supabase
            .from('planes_suscripcion')
            .select('id')
            .eq('nombre', sub['Plan'])
            .single();

          await supabase.from('suscriptores').insert({
            nombre: sub['Nombre'] as string,
            email: sub['Email'] as string || null,
            telefono: sub['Teléfono'] as string || null,
            plan_id: plan?.id || null,
            fecha_inicio: formatDate(sub['Fecha Inicio']),
            status: (sub['Status'] as string)?.toLowerCase() || 'activo',
            origen_adquisicion: sub['Origen'] as string || null,
            notas: sub['Notas'] as string || null,
          });
        }

        // Procesar pagos
        const pagos = preview.registros.filter(r => r._tipo === 'pago');
        for (const pago of pagos) {
          const { data: suscriptor } = await supabase
            .from('suscriptores')
            .select('id')
            .eq('nombre', pago['Suscriptor (Nombre)'])
            .single();

          if (suscriptor) {
            await supabase.from('pagos_suscripcion').insert({
              suscriptor_id: suscriptor.id,
              fecha_cobro: formatDate(pago['Fecha Cobro']),
              fecha_pago: formatDate(pago['Fecha Pago']) || null,
              monto: Number(pago['Monto']) || 0,
              status: (pago['Status'] as string)?.toLowerCase() || 'pendiente',
              metodo_pago: pago['Método Pago'] as string || null,
              notas: pago['Notas'] as string || null,
            });
          }
        }

        // Procesar desbloqueos
        const desbloqueos = preview.registros.filter(r => r._tipo === 'desbloqueo');
        for (const desb of desbloqueos) {
          const { data: suscriptor } = await supabase
            .from('suscriptores')
            .select('id')
            .eq('nombre', desb['Suscriptor (Nombre)'])
            .single();

          if (suscriptor) {
            await supabase.from('desbloqueos').insert({
              suscriptor_id: suscriptor.id,
              fecha: formatDate(desb['Fecha']),
              cantidad: Number(desb['Cantidad']) || 1,
              costo_unitario: Number(desb['Costo Unitario']) || 0,
              total: Number(desb['Total']) || 0,
              notas: desb['Notas'] as string || null,
            });
          }
        }

        // Registrar archivo
        await supabase.from('archivos_subidos').insert({
          nombre_archivo: `SUSCRIPCIONES_${new Date().toISOString().split('T')[0]}`,
          tipo: 'suscripciones',
          registros_procesados: preview.resumen.totalRegistros,
          status: 'procesado',
          datos_json: preview as unknown as Record<string, unknown>,
        });
      }

      if (preview.tipo === 'campana_online') {
        // Crear campaña
        const { data: campana, error: campanaError } = await supabase
          .from('campanas')
          .insert({
            nombre: preview.info.nombre as string,
            tipo: (preview.info.tipo_campana as string) || 'venta_directa',
            plataforma: (preview.info.plataforma as string) || 'meta_ads',
            fecha_inicio: formatDate(preview.info.fecha_inicio),
            fecha_fin: formatDate(preview.info.fecha_fin) || null,
            presupuesto_total: Number(preview.info.presupuesto) || null,
            gasto_real: Number(preview.info.gasto_real) || 0,
            status: 'finalizada',
          })
          .select()
          .single();

        if (campanaError) throw campanaError;

        // Insertar leads
        const leads = preview.registros.filter(r => r._tipo === 'lead');
        if (leads.length > 0) {
          const leadsData = leads.map(l => ({
            campana_id: campana.id,
            fecha: formatDate(l['Fecha']),
            nombre: l['Nombre'] as string || null,
            telefono: l['Teléfono'] as string || null,
            email: l['Email'] as string || null,
            convertido: l['Convertido'] === 'SI',
            fecha_conversion: formatDate(l['Fecha Conversión']) || null,
            monto_venta: Number(l['Monto Venta']) || null,
            notas: l['Notas'] as string || null,
          }));

          await supabase.from('leads').insert(leadsData);
        }

        // Insertar ventas online
        const ventas = preview.registros.filter(r => r._tipo === 'venta_online');
        if (ventas.length > 0) {
          const ventasData = ventas.map(v => ({
            campana_id: campana.id,
            fecha: formatDate(v['Fecha']),
            cliente: v['Cliente'] as string || null,
            producto: v['Producto'] as string || null,
            cantidad: Number(v['Cantidad']) || 1,
            total: Number(v['Total']) || 0,
            costo_envio: Number(v['Costo Envío']) || 0,
            costo_producto: Number(v['Costo Producto']) || 0,
            metodo_pago: v['Método Pago'] as string || null,
            notas: v['Notas'] as string || null,
          }));

          await supabase.from('ventas_online').insert(ventasData);
        }

        // Registrar archivo
        await supabase.from('archivos_subidos').insert({
          nombre_archivo: `CAMPANA_${preview.info.nombre}`,
          tipo: 'campana_online',
          campana_id: campana.id,
          registros_procesados: preview.resumen.totalRegistros,
          status: 'procesado',
          datos_json: preview as unknown as Record<string, unknown>,
        });
      }

      setPreview(null);
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando datos');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await eliminarArchivo(id);
    setConfirmDelete(null);
  };

  const formatDate = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'number') {
      // Excel date serial number
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    return '';
  };

  const tipoLabels: Record<FileType, string> = {
    evento: 'Evento',
    suscripciones: 'Suscripciones',
    campana_online: 'Campaña Online',
  };

  const tipoColors: Record<FileType, string> = {
    evento: 'bg-amber-100 text-amber-700',
    suscripciones: 'bg-emerald-100 text-emerald-700',
    campana_online: 'bg-violet-100 text-violet-700',
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Finanzas & Excel</h2>
          <p className="text-sm text-stone-500">Carga tus archivos y gestiona el historial</p>
        </div>
        
        <div className="flex gap-3">
          <label className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-800 cursor-pointer transition-colors">
            <Upload size={18} />
            Subir Excel
            <input 
              type="file" 
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          
          <button className="flex items-center gap-2 bg-stone-100 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-200 transition-colors">
            <Download size={18} />
            Plantillas
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <AlertCircle size={20} />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={18} />
          </button>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-stone-900">Confirmar Carga</h3>
                <span className={`inline-block mt-2 text-xs font-medium px-2 py-1 rounded-full ${tipoColors[preview.tipo]}`}>
                  {tipoLabels[preview.tipo]}
                </span>
              </div>
              <button onClick={() => setPreview(null)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="bg-stone-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-stone-700 mb-2">Resumen:</p>
              <ul className="space-y-1">
                {preview.resumen.preview.map((item, i) => (
                  <li key={i} className="text-sm text-stone-600 flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-stone-500 mt-3">
                Total: {preview.resumen.totalRegistros} registros a procesar
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIAL */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">Historial de Archivos</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin text-stone-400 mx-auto" />
          </div>
        ) : archivos.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet size={48} className="mx-auto mb-4 text-stone-300" />
            <p className="text-stone-500">No hay archivos cargados</p>
            <p className="text-sm text-stone-400 mt-1">Sube tu primer Excel para comenzar</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {archivos.map((archivo) => (
              <div key={archivo.id} className="px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-stone-100 rounded-lg">
                    <FileText size={20} className="text-stone-600" />
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">{archivo.nombre_archivo}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tipoColors[archivo.tipo]}`}>
                        {tipoLabels[archivo.tipo]}
                      </span>
                      <span className="text-xs text-stone-500">
                        {archivo.registros_procesados} registros
                      </span>
                      <span className="text-xs text-stone-400">
                        {new Date(archivo.fecha_subida).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {archivo.status === 'procesado' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle size={14} />
                      Procesado
                    </span>
                  )}
                  {archivo.status === 'error' && (
                    <span className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle size={14} />
                      Error
                    </span>
                  )}
                  
                  <button className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg">
                    <Eye size={18} />
                  </button>
                  
                  {confirmDelete === archivo.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-stone-500 hover:text-stone-700"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleDelete(archivo.id)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Confirmar
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmDelete(archivo.id)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* P&L PLACEHOLDER */}
      <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center">
        <FileSpreadsheet size={48} className="mx-auto mb-4 text-stone-300" />
        <h3 className="font-semibold text-stone-900">Estado de Resultados</h3>
        <p className="text-sm text-stone-500 mt-1">
          El P&L se generará automáticamente cuando cargues datos
        </p>
      </div>
    </div>
  );
}
