'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { fileService } from '@/services/file.service';
import { apiFetch } from '@/services/api';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface FileAnalysis {
  id: string;
  url: string;
  type: string;
  status?: string;
  preview_url?: string;
  album_id: string;
  user_id?: string;
  user_email?: string;
  album_title?: string;
  stego_entropy?: number;
  stego_detected?: boolean;
  chi_square?: number;
  pdf_javascript?: boolean;
  pdf_attachments?: boolean;
  pdf_details?: string[];
  analysis_logs?: string[];
  analysis_metadata?: any;
  lsb_ratio_ones?: number;
  chi_square_p_value?: number;
  dct_variance_proxy?: number;
  structure_result?: string;
}

function QuarantineContent() {
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');
  const [fileData, setFileData] = useState<FileAnalysis | null>(null);
  const [thresholds, setThresholds] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    action: 'approve' | 'reject';
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      if (!fileId) {
        setLoading(false);
        return;
      }
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setSupervisorId(user.id);

        try {
          const configData = await apiFetch('/api/config/thresholds');
          if (configData && configData.image) {
            setThresholds(configData.image);
          } else {
            setThresholds({
              lsb_ratio_min: 0.498, lsb_ratio_max: 0.502, chi_p_threshold: 0.995, dct_variance_threshold: 8.0
            });
          }
        } catch (e) {
          setThresholds({
            lsb_ratio_min: 0.498, lsb_ratio_max: 0.502, chi_p_threshold: 0.995, dct_variance_threshold: 8.0
          });
        }

        const files = await fileService.getQuarantinedFiles(user.id);
        const file = files.find((f: any) => f.id === fileId);
        if (file) {
          // Extract metadata from analysis_metadata field if present
          const meta = file.analysis_metadata || {};

          // Translate analysis logs to Spanish
          const translateLog = (log: string): string => {
            const translations: Record<string, string> = {
              'Anomalous frequency distribution detected.':
                'Distribución de frecuencias anómala detectada en los píxeles del archivo.',
              'EXIF data stripped. Standard baseline profile confirmed.':
                'Datos EXIF eliminados. Perfil base estándar confirmado.',
              'LSB anomaly detected.':
                'Anomalía en bits menos significativos (LSB) detectada.',
              'Chi-square attack positive: artificial pixel distribution.':
                'Análisis Chi-cuadrado positivo: distribución artificial de píxeles.',
              'DCT variance anomaly: unnaturally smooth image.':
                'Varianza DCT anómala: imagen artificialmente suavizada.',
              'JavaScript embedded in link found.':
                'JavaScript embebido detectado en un enlace del PDF.',
              'JavaScript in widget (Form) found.':
                'JavaScript en un widget de formulario del PDF.',
              'Embedded files found.':
                'Archivos adjuntos ocultos encontrados en el PDF.',
            };
            return translations[log] || log;
          };

          // Build logs from analysis_metadata or pdf_details
          let logs: string[] = [];
          if (meta.pdf_details && Array.isArray(meta.pdf_details)) {
            logs = meta.pdf_details.map(translateLog);
          } else if (Array.isArray(meta.details)) {
            logs = meta.details.map(translateLog);
          } else if (file.analysis_logs) {
            logs = file.analysis_logs.map(translateLog);
          } else {
            logs = [
              'Contenido marcado para revisión manual por el sistema de análisis.',
            ];
          }

          // Fetch user email for this file
          let userEmail = '—';
          let albumTitle = file.album_id?.substring(0, 12) + '…';
          try {
            const albumData = await apiFetch(`/api/albums/${file.album_id}`);
            if (albumData) {
              albumTitle = albumData.title || albumTitle;
              const { users } = await apiFetch(
                `/api/admin/users?supervisor_id=${user.id}`,
              );
              const match = users.find((u: any) => u.id === albumData.user_id);
              userEmail = match?.email || albumData.user_id || '—';
            }
          } catch {}

          setFileData({
            ...file,
            type: file.file_type || file.type,
            user_email: userEmail,
            album_title: albumTitle,
            stego_entropy:
              meta.stego_entropy || meta.lsb_ratio_ones
                ? Math.round(meta.lsb_ratio_ones * 100)
                : file.stego_entropy,
            stego_detected:
              meta.lsb_anomaly ||
              meta.chi_square_anomaly ||
              meta.dct_anomaly ||
              file.stego_detected,
            lsb_ratio_ones: meta.lsb_ratio_ones,
            chi_square_p_value: meta.chi_square_p_value,
            dct_variance_proxy: meta.dct_variance_proxy,
            structure_result: meta.details || meta.structure || null,
            pdf_javascript: meta.pdf_javascript || (meta.pdf_details?.some((d: string) => d.toLowerCase().includes('javascript'))) || false,
            analysis_logs: logs,
          });
        }
      } catch (err: any) {
        console.error('Error loading file data', err);
        if (
          err.message?.includes('403') ||
          err.message?.includes('Access Denied')
        ) {
          router.push('/dashboard');
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [fileId, router]);

  const openDecisionModal = (action: 'approve' | 'reject') => {
    setDecisionReason('');
    setDecisionModal({ action });
  };

  const closeDecisionModal = () => {
    setDecisionModal(null);
    setDecisionReason('');
  };

  const handleDecision = async () => {
    if (!fileData || !supervisorId || !decisionModal) return;
    try {
      await fileService.decideFile(
        fileData.id,
        supervisorId,
        decisionModal.action,
        decisionReason.trim(),
      );
      window.location.href = '/supervisor';
    } catch (err) {
      console.error(`Failed to ${decisionModal.action} file:`, err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">
          refresh
        </span>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <span className="material-symbols-outlined text-4xl text-error mb-4">
          error
        </span>
        <h2 className="font-headline-md text-headline-md">
          Archivo no encontrado
        </h2>
        <Link
          href="/supervisor"
          className="mt-4 text-primary-container hover:underline"
        >
          Volver a Aprobaciones
        </Link>
      </div>
    );
  }

  const isPdf =
    fileData.type === 'pdf' ||
    fileData.type === 'application/pdf' ||
    fileData.type?.toLowerCase?.().includes('pdf');
  const previewSrc = fileData.preview_url || fileData.url || '';

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
      {/* Header Section */}
      <div className="col-span-1 md:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-end mb-md gap-md">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-background mb-unit">
            Reporte de Análisis
          </h2>
          <p className="font-body-lg text-body-lg text-secondary">
            El contenido marcado requiere revisión manual.
          </p>
        </div>
        <div className="flex items-center gap-sm bg-[#F0F0F0] px-4 py-2 rounded-full">
          <span className="material-symbols-outlined text-secondary text-lg">
            warning
          </span>
          <span className="font-label-md text-label-md text-on-surface">
            Prioridad Alta
          </span>
        </div>
      </div>

      {/* Image Container (Left Column) */}
      <div className="col-span-1 md:col-span-7 flex flex-col gap-md">
        <div className="relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] group flex justify-center items-center min-h-[400px]">
          {isPdf ? (
            <iframe
              src={`${previewSrc}#view=FitH&toolbar=0&navpanes=0`}
              className="w-full h-[600px] border-0"
              title="PDF Preview"
            ></iframe>
          ) : (
            <img
              className="w-full h-auto object-contain max-h-[618px]"
              src={previewSrc}
              alt="Flagged Content"
            />
          )}
          {/* Overlay Actions */}
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-on-surface hover:bg-white transition-colors shadow-sm cursor-pointer">
              <span className="material-symbols-outlined text-xl">zoom_in</span>
            </button>
            <a
              href={fileData.url}
              download
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-on-surface hover:bg-white transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">
                download
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Analysis Data (Right Column) */}
      <div className="col-span-1 md:col-span-5 flex flex-col gap-lg">
        {/* Key Metrics Bento */}
        <div className="grid grid-cols-2 gap-sm">
          {/* Metric 1 */}
          <div className="bg-surface-container-lowest p-md rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] border border-[#F0F0F0]/50 flex flex-col gap-sm hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.06)] transition-shadow">
            <div className="flex items-center gap-2 text-secondary">
              <span className="material-symbols-outlined text-sm">
                analytics
              </span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                Entropía
              </span>
            </div>
            <div className="font-headline-md text-headline-md text-error">
              {fileData.stego_entropy?.toFixed(1) || 'N/A'}%
            </div>
            <div className="w-full bg-[#F0F0F0] rounded-full h-1 mt-auto">
              <div
                className="bg-error h-1 rounded-full"
                style={{ width: `${fileData.stego_entropy || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-surface-container-lowest p-md rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] border border-[#F0F0F0]/50 flex flex-col gap-sm hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.06)] transition-shadow">
            <div className="flex items-center gap-2 text-secondary">
              <span className="material-symbols-outlined text-sm">flag</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                Detección
              </span>
            </div>
            <div className="mt-auto">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                isPdf 
                  ? fileData.pdf_javascript ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  : fileData.stego_detected ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>
                <span className="material-symbols-outlined text-[16px]">
                  {isPdf ? (fileData.pdf_javascript ? 'bug_report' : 'warning') : (fileData.stego_detected ? 'bug_report' : 'warning')}
                </span>
                {isPdf
                  ? fileData.pdf_javascript
                    ? 'JS Malicioso en PDF'
                    : 'PDF Sospechoso'
                  : fileData.stego_detected
                    ? 'Esteganografía LSB'
                    : 'Datos Anómalos'}
              </span>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-surface-container-lowest p-md rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] border border-[#F0F0F0]/50 flex flex-col gap-sm col-span-2">
            <div className="flex items-center gap-2 text-secondary mb-unit">
              <span className="material-symbols-outlined text-sm">
                fingerprint
              </span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                Firmas de Archivo
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <span className="block font-label-sm text-label-sm text-secondary mb-0.5">
                  Propietario
                </span>
                <span
                  className="font-body-sm text-body-sm text-on-surface block truncate"
                  title={fileData.user_email}
                >
                  {fileData.user_email || '—'}
                </span>
              </div>
              <div>
                <span className="block font-label-sm text-label-sm text-secondary mb-0.5">
                  Tipo de Archivo
                </span>
                <span className="font-body-md text-body-md text-on-surface uppercase font-medium">
                  {isPdf
                    ? 'PDF'
                    : fileData.type === 'image'
                      ? 'Imagen'
                      : fileData.type?.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="block font-label-sm text-label-sm text-secondary mb-0.5">
                  Álbum
                </span>
                <span
                  className="font-body-sm text-body-sm text-on-surface block truncate"
                  title={fileData.album_title}
                >
                  {fileData.album_title || '—'}
                </span>
              </div>
              <div>
                <span className="block font-label-sm text-label-sm text-secondary mb-0.5">
                  Estado
                </span>
                <span className="font-body-md text-body-md text-on-surface uppercase font-medium">
                  {fileData.status === 'quarantined'
                    ? 'Cuarentena'
                    : fileData.status || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Metrics - IMAGES */}
        {!isPdf && thresholds && (
          <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] border border-[#F0F0F0]/50 flex flex-col gap-md">
            <div className="flex justify-between items-center border-b border-[#F0F0F0] pb-sm">
              <h3 className="font-headline-sm text-headline-sm text-on-background">Señales Técnicas (Imagen)</h3>
              <span className="text-xs font-medium text-[#0079b6] bg-[#e6f4f1] px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">tune</span>
                Umbrales de referencia activos
              </span>
            </div>
            
            <div className="flex flex-col gap-4 mt-2">
              {/* LSB Ratio */}
              {(() => {
                const val = fileData.lsb_ratio_ones;
                const isAnomalous = val != null && val > thresholds.lsb_ratio_min && val < thresholds.lsb_ratio_max;
                return (
                  <div className={`p-4 rounded-xl border-l-4 ${isAnomalous ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'} flex items-center justify-between gap-3`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`material-symbols-outlined text-[20px] ${isAnomalous ? 'text-red-500' : 'text-green-600'}`}>bar_chart</span>
                        <h4 className="font-bold text-on-surface uppercase text-sm">LSB Ratio</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${isAnomalous ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                          {isAnomalous ? 'ANÓMALO' : 'NORMAL'}
                        </span>
                      </div>
                      <p className="text-xs text-secondary">
                        Peligro si el valor cae en el rango [{thresholds.lsb_ratio_min} - {thresholds.lsb_ratio_max}]. Fuera de este rango es seguro.
                      </p>
                    </div>
                    <div className={`text-lg sm:text-2xl font-black tracking-tight shrink-0 ${isAnomalous ? 'text-red-600' : 'text-green-600'}`}>
                      {val?.toFixed(4) ?? 'N/A'}
                    </div>
                  </div>
                );
              })()}

              {/* Chi-Square */}
              {(() => {
                const val = fileData.chi_square_p_value;
                const isAnomalous = val != null && val > thresholds.chi_p_threshold;
                return (
                  <div className={`p-4 rounded-xl border-l-4 ${isAnomalous ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'} flex items-center justify-between gap-3`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`material-symbols-outlined text-[20px] ${isAnomalous ? 'text-red-500' : 'text-green-600'}`}>functions</span>
                        <h4 className="font-bold text-on-surface uppercase text-sm">Chi-Square p-value</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${isAnomalous ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                          {isAnomalous ? 'ANÓMALO' : 'NORMAL'}
                        </span>
                      </div>
                      <p className="text-xs text-secondary">
                        Peligro si es mayor a {thresholds.chi_p_threshold}. Indica distribución artificial de pixeles.
                      </p>
                    </div>
                    <div className={`text-lg sm:text-2xl font-black tracking-tight shrink-0 ${isAnomalous ? 'text-red-600' : 'text-green-600'}`}>
                      {val?.toFixed(4) ?? 'N/A'}
                    </div>
                  </div>
                );
              })()}

              {/* DCT Variance */}
              {(() => {
                const val = fileData.dct_variance_proxy;
                const isAnomalous = val != null && val < thresholds.dct_variance_threshold;
                return (
                  <div className={`p-4 rounded-xl border-l-4 ${isAnomalous ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'} flex items-center justify-between gap-3`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`material-symbols-outlined text-[20px] ${isAnomalous ? 'text-red-500' : 'text-green-600'}`}>blur_on</span>
                        <h4 className="font-bold text-on-surface uppercase text-sm">Varianza DCT</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${isAnomalous ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                          {isAnomalous ? 'ANÓMALO' : 'NORMAL'}
                        </span>
                      </div>
                      <p className="text-xs text-secondary">
                        Peligro si es menor a {thresholds.dct_variance_threshold}. Indica imagen artificialmente suavizada.
                      </p>
                    </div>
                    <div className={`text-lg sm:text-2xl font-black tracking-tight shrink-0 ${isAnomalous ? 'text-red-600' : 'text-green-600'}`}>
                      {val?.toFixed(2) ?? 'N/A'}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Technical Metrics - PDFs */}
        {isPdf && (
          <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] border border-[#F0F0F0]/50 flex flex-col gap-md">
            <div className="flex justify-between items-center border-b border-[#F0F0F0] pb-sm">
              <h3 className="font-headline-sm text-headline-sm text-on-background">Análisis de Estructura PDF</h3>
              <span className="text-xs font-medium text-[#0079b6] bg-[#e6f4f1] px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">shield_find</span>
                Inspección de seguridad
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {/* JS Box */}
              <div className={`p-4 rounded-xl border ${fileData.pdf_javascript ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`material-symbols-outlined ${fileData.pdf_javascript ? 'text-red-600' : 'text-green-600'}`}>
                    {fileData.pdf_javascript ? 'code_blocks' : 'code_off'}
                  </span>
                  <span className="font-bold text-on-surface">JavaScript Embebido</span>
                </div>
                <p className={`text-sm ${fileData.pdf_javascript ? 'text-red-700' : 'text-green-700'}`}>
                  {fileData.pdf_javascript ? 'Se detectaron scripts ejecutables en el PDF. Riesgo alto de ejecución de código o XSS.' : 'No se detectaron scripts ejecutables.'}
                </p>
              </div>
              
              {/* Embedded Box */}
              <div className={`p-4 rounded-xl border ${fileData.analysis_metadata?.embedded_count > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`material-symbols-outlined ${fileData.analysis_metadata?.embedded_count > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {fileData.analysis_metadata?.embedded_count > 0 ? 'attachment' : 'task'}
                  </span>
                  <span className="font-bold text-on-surface">Archivos Ocultos</span>
                </div>
                <p className={`text-sm ${fileData.analysis_metadata?.embedded_count > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                  {fileData.analysis_metadata?.embedded_count > 0 
                    ? `Se encontraron ${fileData.analysis_metadata.embedded_count} archivo(s) adjunto(s). Peligro de malware oculto (Políglotas).` 
                    : 'No se encontraron archivos adjuntos o embebidos.'}
                </p>
              </div>
            </div>
            <div className="text-xs text-secondary mt-2 bg-surface-container-high/50 p-3 rounded-lg flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">info</span>
              <p>Los PDFs maliciosos suelen utilizar JavaScript y archivos embebidos (Polyglots) para esconder payloads que comprometen la máquina del usuario final.</p>
            </div>
          </div>
        )}

        {/* Details Section */}
        <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] border border-[#F0F0F0]/50 flex flex-col gap-md">
          <h3 className="font-headline-sm text-headline-sm text-on-background border-b border-[#F0F0F0] pb-sm">
            Registros de Análisis
          </h3>
          <div className="space-y-4">
            {fileData.analysis_logs?.length ? (
              fileData.analysis_logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span
                    className={`material-symbols-outlined ${idx === 0 ? 'text-error' : 'text-[#0079b6]'} text-lg mt-1`}
                  >
                    {idx === 0 ? 'error' : 'info'}
                  </span>
                  <p className="font-body-md text-body-md text-on-surface">
                    {log}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-secondary font-body-sm text-body-sm">
                No se registraron eventos de análisis adicionales.
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-sm mt-auto">
          <button
            onClick={() => openDecisionModal('reject')}
            className="w-full bg-primary-container text-on-primary py-4 rounded-full font-label-md text-label-md hover:bg-surface-tint transition-colors shadow-[0_4px_14px_0_rgba(230,0,35,0.2)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">block</span>
            Rechazar Archivo
          </button>
          <button
            onClick={() => openDecisionModal('approve')}
            className="w-full bg-[#F0F0F0] text-on-surface py-4 rounded-full font-label-md text-label-md hover:bg-[#E5E5E5] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">
              check_circle
            </span>
            Aprobar (Falso Positivo)
          </button>
        </div>
      </div>

      {decisionModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-[min(92vw,520px)] min-w-[280px] bg-surface-container-lowest rounded-2xl shadow-[0_20px_60px_-25px_rgba(0,0,0,0.4)] p-6">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">
              {decisionModal.action === 'approve' ? 'Aprobar' : 'Rechazar'}{' '}
              archivo
            </h3>
            <p className="text-secondary text-sm mb-4">Motivo (opcional)</p>
            <textarea
              className="w-full bg-secondary-fixed border-none rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary-container outline-none resize-none"
              rows={3}
              placeholder="Escribe una breve justificación"
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
            />
            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={closeDecisionModal}
                className="px-4 py-2 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDecision}
                className={`px-4 py-2 rounded-full text-white transition-colors cursor-pointer ${decisionModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Quarantine() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md text-body-md antialiased pb-24 pt-20">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border-b-0 hidden md:flex">
        <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/supervisor">
              <span className="material-symbols-outlined text-[#E60023] text-2xl cursor-pointer">
                arrow_back
              </span>
            </Link>
            <h1 className="text-[#E60023] font-bold text-2xl tracking-tighter font-display-lg">
              SecureFrame
            </h1>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/supervisor"
              className="text-zinc-500 hover:bg-zinc-100 transition-colors duration-200 px-4 py-2 rounded-full font-label-md text-label-md"
            >
              Historial
            </Link>
            <span className="text-zinc-900 bg-zinc-100 transition-colors duration-200 px-4 py-2 rounded-full font-label-md text-label-md">
              Análisis de Cuarentena
            </span>
          </nav>
          <button
            onClick={handleLogout}
            className="h-10 w-10 rounded-full bg-surface-variant overflow-hidden flex items-center justify-center hover:bg-red-50 text-on-surface hover:text-red-500 transition-colors duration-200 cursor-pointer"
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-container-margin py-lg">
        <Suspense
          fallback={
            <div className="flex justify-center p-20">
              <span className="material-symbols-outlined animate-spin text-primary text-4xl">
                refresh
              </span>
            </div>
          }
        >
          <QuarantineContent />
        </Suspense>
      </main>
    </div>
  );
}
