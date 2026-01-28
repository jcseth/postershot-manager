'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  X,
  Loader2,
  FileText,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

type FileType = 'evento' | 'suscripciones' | 'campana_online';

interface ArchivoSubido {
  id: string;
  nombre_archivo: string;
  tipo: FileType;
  evento_id: string | null;
  campana_id: string | null;
  fecha_subida: string;
  registros_procesados: number;
  status: string;
}

interface ParsedData {
  tipo: FileType;
  info: Record<string, any>;
  registros: Record<string, any>[];
  resumen: {
    totalRegistros: number;
    preview: string[];
  };
}

// URLs de las plantillas (GitHub raw o donde las subas)
const PLANTILLAS = {
  evento: 'https://github.com/jcseth/postershot-manager/raw/main/templates/PLANTILLA_EVENTO.xlsx',
  suscripciones: 'https://github.com/jcseth/postershot-manager/raw/main/templates/PLANTILLA_SUSCRIPCIONES.xlsx',
  campana: 'https://github.com/jcseth/postershot-manager/raw/main/templates/PLANTILLA_CAMPANA_ONLINE.xlsx',
};

export default function FinancesView() {
  const [archivos, setArchivos] = useState<ArchivoSubido[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ParsedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showPlantillas, setShowPlantillas] = useState(false);

  // Cargar archivos
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

  // Detectar tipo de archivo
  const detectFileType = (sheetNames: string[]): FileType | null => {
    if (sheetNames.includes('INFO_EVENTO') && sheetNames.includes('VENTAS')) return 'evento';
    if (sheetNames.includes('SUSCRIPTORES') && sheetNames.includes('PAGOS_MENSUALIDAD')) return 'suscripciones';
    if (sheetNames.includes('INFO_CAMPAÑA') && sheetNames.includes('LEADS')) return 'campana_online';
    return null;
  };

  // Formatear fecha
  const formatDate = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'number') {
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

  // Parsear Excel
  const parseExcel = useCallback(async (file: File): Promise<ParsedData | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const tipo = detectFileType(workbook.SheetNames);
          if (!tipo) {
            reject(new Error('Formato no reconocido. Usa las plantillas oficiales.'));
            return;
          }

          let info: Record<string, any> = {};
          let registros: Record<string, any>[] = [];
          let preview: string[] = [];

          if (tipo === 'evento') {
            const infoSheet = XLSX.utils.sheet_to_json(workbook.Sheets['INFO_EVENTO'], { header: 1 }) as any[][];
            info = {
              nombre: infoSheet[2]?.[1] || '',
              deporte: infoSheet[3]?.[1] || '',
              fecha_inicio: infoSheet[4]?.[1] || '',
              fecha_fin: infoSheet[5]?.[1] || '',
              ubicacion: infoSheet[6]?.[1] || '',
              participantes: infoSheet[7]?.[1] || 0,
              fee: infoSheet[8]?.[1] || 0,
            };

            const ventasSheet = XLSX.utils.sheet_to_json(workbook.Sheets['VENTAS']) as any[];
            const ventas = ventasSheet.filter(row => row['Fecha'] && row['Total']);
            
            const gastosSheet = XLSX.utils.sheet_to_json(workbook.Sheets['GASTOS']) as any[];
            const gastos = gastosSheet.filter(row => row['Fecha'] && row['Monto']);

            registros = [
              ...ventas.map(v => ({ ...v, _tipo: 'venta' })), 
              ...gastos.map(g => ({ ...g, _tipo: 'gasto' }))
            ];
            
            preview = [
              `Evento: ${info.nombre}`,
              `Ventas: ${ventas.length} registros`,
              `Gastos: ${gastos.length} registros`,
            ];
          }

          if (tipo === 'suscripciones') {
            const subsSheet = XLSX.utils.sheet_to_json(workbook.Sheets['SUSCRIPTORES']) as any[];
            const pagosSheet = XLSX.utils.sheet_to_json(workbook.Sheets['PAGOS_MENSUALIDAD']) as any[];
            const desbSheet = XLSX.utils.sheet_to_json(workbook.Sheets['DESBLOQUEOS']) as any[];
            const invSheet = XLSX.utils.sheet_to_json(workbook.Sheets['VENTA_INVENTARIO']) as any[];

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
            const infoSheet = XLSX.utils.sheet_to_json(workbook.Sheets['INFO_CAMPAÑA'], { header: 1 }) as any[][];
            info = {
              nombre: infoSheet[2]?.[1] || '',
              tipo_campana: infoSheet[3]?.[1] || '',
              plataforma: infoSheet[4]?.[1] || '',
              fecha_inicio: infoSheet[5]?.[1] || '',
              fecha_fin: infoSheet[6]?.[1] || '',
              presupuesto: infoSheet[7]?.[1] || 0,
              gasto_real: infoSheet[8]?.[1] || 0,
            };

            const leadsSheet = XLSX.utils.sheet_to_json(workbook.Sheets['LEADS']) as any[];
            const ventasSheet = XLSX.utils.sheet_to_json(workbook.Sheets['VENTAS_ONLINE']) as any[];

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

          resolve({ tipo, info, registros, resumen: { totalRegistros: registros.length, preview } });
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Error leyendo el archivo'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Manejar subida de archivo
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

  // Confirmar subida
  const handleConfirmUpload = async () => {
    if (!preview) return;

    setUploading(true);
    setError(null);

    try {
      if (preview.tipo === 'evento') {
        const { data: evento, error: eventoError } = await supabase
          .from('eventos')
          .insert({
            nombre: preview.info.nombre as string,
            deporte: preview.info.deporte as string,
            fecha_inicio: formatDate(preview.info.fecha_inicio),
            fecha_fin: formatDate(preview.info.fecha_fin) || null,
            ubicacion: preview.info.ubicacion as string,
            participantes_aprox: Number(preview.info.participantes) || null,
            fee_entrada: Number(preview.info.fee) || 0,
            status: 'finalizado',
          })
          .select()
          .single();

        if (eventoError) throw eventoError;

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
          await supabase.from('ventas_evento').insert(ventas);
        }

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
          await supabase.from('gastos_evento').insert(gastos);
        }

        await supabase.from('archivos_subidos').insert({
          nombre_archivo: `EVENTO_${preview.info.nombre}`,
          tipo: 'evento',
          evento_id: evento.id,
          registros_procesados: preview.resumen.totalRegistros,
          status: 'procesado',
        });
      }

      // ... (código para suscripciones y campañas similar)

      setPreview(null);
      fetchArchivos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando datos');
    } finally {
      setUploading(false);
    }
  };

  // ELIMINAR ARCHIVO Y SUS DATOS
  const handleDelete = async (archivo: ArchivoSubido) => {
    setDeleting(true);
    
    try {
      // Eliminar datos asociados según el tipo
      if (archivo.tipo === 'evento' && archivo.evento_id) {
        // Eliminar ventas del evento
        await supabase.from('ventas_evento').delete().eq('evento_id', archivo.evento_id);
        // Eliminar gastos del evento
        await supabase.from('gastos_evento').delete().eq('evento_id', archivo.evento_id);
        // Eliminar el evento
        await supabase.from('eventos').delete().eq('id', archivo.evento_id);
      }

      if (archivo.tipo === 'campana_online' && archivo.campana_id) {
        await supabase.from('leads').delete().eq('campana_id', archivo.campana_id);
        await supabase.from('ventas_online').delete().eq('campana_id', archivo.campana_id);
        await supabase.from('campanas').delete().eq('id', archivo.campana_id);
      }

      // Marcar archivo como eliminado
      await supabase
        .from('archivos_subidos')
        .update({ status: 'eliminado' })
        .eq('id', archivo.id);

      setConfirmDelete(null);
      fetchArchivos();
    } catch (err) {
      setError('Error eliminando datos');
    } finally {
      setDeleting(false);
    }
  };

  const tipoLabels: Record<FileType, string> = {
    evento: 'Evento',
    suscripciones: 'Suscripciones',
    campana_online: 'Campaña',
  };

  const tipoColors: Record<FileType, string> = {
    evento: 'bg-blue-100 text-blue-700',
    suscripciones: 'bg-green-100 text-green-700',
    campana_online: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Finanzas</h2>
          <p className="text-sm text-gray-500">Carga archivos Excel y gestiona tus datos financieros</p>
        </div>
        
        <div className="flex gap-2">
          <label className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer transition-colors">
            <Upload size={16} />
            Subir Excel
            <input 
              type="file" 
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          
          <button 
            onClick={() => setShowPlantillas(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            Plantillas
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* MODAL PLANTILLAS */}
      {showPlantillas && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Descargar Plantillas</h3>
              <button onClick={() => setShowPlantillas(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <a 
                href={PLANTILLAS.evento}
                download
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={20} className="text-blue-600" />
                  <span className="text-sm font-medium">Plantilla Evento</span>
                </div>
                <ExternalLink size={16} className="text-gray-400" />
              </a>
              
              <a 
                href={PLANTILLAS.suscripciones}
                download
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={20} className="text-green-600" />
                  <span className="text-sm font-medium">Plantilla Suscripciones</span>
                </div>
                <ExternalLink size={16} className="text-gray-400" />
              </a>
              
              <a 
                href={PLANTILLAS.campana}
                download
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={20} className="text-purple-600" />
                  <span className="text-sm font-medium">Plantilla Campaña Online</span>
                </div>
                <ExternalLink size={16} className="text-gray-400" />
              </a>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Usa estas plantillas para asegurar que tus datos se procesen correctamente.
            </p>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Confirmar Carga</h3>
                <span className={`inline-block mt-2 text-xs font-medium px-2 py-1 rounded-full ${tipoColors[preview.tipo]}`}>
                  {tipoLabels[preview.tipo]}
                </span>
              </div>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Resumen:</p>
              <ul className="space-y-1">
                {preview.resumen.preview.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIAL */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Historial de Archivos</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin text-gray-400 mx-auto" />
          </div>
        ) : archivos.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No hay archivos cargados</p>
            <p className="text-sm text-gray-400 mt-1">Sube tu primer Excel para comenzar</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {archivos.map((archivo) => (
              <div key={archivo.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText size={18} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{archivo.nombre_archivo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tipoColors[archivo.tipo]}`}>
                        {tipoLabels[archivo.tipo]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {archivo.registros_procesados} registros
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(archivo.fecha_subida).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {confirmDelete === archivo.id ? (
                    <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg">
                      <span className="text-xs text-red-600">¿Eliminar datos?</span>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        No
                      </button>
                      <button
                        onClick={() => handleDelete(archivo)}
                        disabled={deleting}
                        className="text-xs text-red-600 font-medium hover:text-red-700"
                      >
                        {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmDelete(archivo.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ESTADO DE RESULTADOS */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Estado de Resultados</h3>
        <p className="text-sm text-gray-500">
          El estado de resultados se generará automáticamente conforme cargues más datos de eventos y gastos.
        </p>
      </div>
    </div>
  );
}
