import { useEffect, useState } from 'react'
import { api, fetchWithAuth, DayReport, DayDetail, MonthReport, Treatment } from '../api'

const MONTHS_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DAYS_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

type Tab = 'day' | 'month' | 'treatment'

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('day')
  const [isLoading, setIsLoading] = useState(false)

  // Filtros
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [filterYear, setFilterYear] = useState<number>(currentYear)
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth)

  // Datos
  const [catalog, setCatalog] = useState<Treatment[]>([])
  const [dayData, setDayData] = useState<DayReport[]>([])
  const [monthData, setMonthData] = useState<MonthReport[]>([])

  // Por tratamiento
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<number | ''>('')
  const [treatmentMode, setTreatmentMode] = useState<'year' | 'month' | 'day'>('month')
  const [treatmentFilterYear, setTreatmentFilterYear] = useState<number>(currentYear)
  const [treatmentFilterMonth, setTreatmentFilterMonth] = useState<number>(currentMonth)
  const [treatmentFilterDate, setTreatmentFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [treatmentRecords, setTreatmentRecords] = useState<{date: string, quantity: number, total_commission: number}[]>([])

  // Detalle de un día
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [dayDetail, setDayDetail] = useState<DayDetail[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // PDF export
  const [exportingPdf, setExportingPdf] = useState<string | null>(null)

  useEffect(() => {
    // Load catalog initially for the dropdowns
    api.fetchCatalog().then(setCatalog).catch(console.error)
  }, [])

  useEffect(() => {
    if (tab === 'day' || tab === 'month') {
      loadReport()
    }
  }, [tab, filterMonth, filterYear])

  useEffect(() => {
    if (tab === 'treatment' && selectedTreatmentId !== '') {
      loadTreatmentData()
    }
  }, [tab, selectedTreatmentId, treatmentMode, treatmentFilterYear, treatmentFilterMonth, treatmentFilterDate])

  const loadReport = async () => {
    setIsLoading(true)
    setExpandedDay(null)
    try {
      if (tab === 'day') {
        const data = await api.fetchReportByDay(filterMonth, filterYear)
        setDayData(data)
      } else if (tab === 'month') {
        const data = await api.fetchReportByMonth()
        setMonthData(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTreatmentData = async () => {
    if (!selectedTreatmentId) return
    setIsLoading(true)
    try {
      let y, m, d
      if (treatmentMode === 'year') {
        y = treatmentFilterYear
      } else if (treatmentMode === 'month') {
        y = treatmentFilterYear
        m = treatmentFilterMonth
      } else if (treatmentMode === 'day') {
        d = treatmentFilterDate
      }
      
      const data = await api.fetchTreatmentDetails(Number(selectedTreatmentId), y, m, d)
      setTreatmentRecords(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDayDetail = async (dateStr: string) => {
    if (expandedDay === dateStr) {
      setExpandedDay(null)
      return
    }
    setLoadingDetail(true)
    try {
      const data = await api.fetchDayDetail(dateStr)
      setDayDetail(data)
      setExpandedDay(dateStr)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleExportPdf = async (monthYear: string) => {
    setExportingPdf(monthYear)
    try {
      const res = await fetchWithAuth(`/api/reports/export-month/${monthYear}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Error desconocido' }))
        alert(err.detail || 'Error al generar PDF')
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DentalTrack_${monthYear}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Error al descargar el PDF')
    } finally {
      setExportingPdf(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const dayName = DAYS_NAMES[d.getDay()]
    return `${dayName} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  }

  const formatMonthYear = (my: string) => {
    const [y, m] = my.split('-')
    return `${MONTHS_NAMES[parseInt(m)]} ${y}`
  }

  // Totales
  const dayTotal = dayData.reduce((s, r) => s + r.total_commission, 0)

  const treatmentRecordsTotal = treatmentRecords.reduce((s, r) => s + r.total_commission, 0)
  const treatmentRecordsQty = treatmentRecords.reduce((s, r) => s + r.quantity, 0)

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'day', label: 'Por día', icon: '📅' },
    { key: 'month', label: 'Por mes', icon: '🗓️' },
    { key: 'treatment', label: 'Por tratamiento', icon: '🦷' },
  ]

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-gray-800">Informes</h2>

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200
              ${tab === t.key
                ? 'bg-dental-blue text-white shadow-md scale-[1.02]'
                : 'bg-white text-gray-500 shadow-sm active:scale-95'
              }`}
          >
            <span className="block text-base mb-0.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Filtros para 'day' ── */}
      {tab === 'day' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Mes</label>
            <select
              className="input-field py-2 text-sm"
              value={filterMonth}
              onChange={e => setFilterMonth(Number(e.target.value))}
            >
              {MONTHS_NAMES.slice(1).map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
            <select
              className="input-field py-2 text-sm"
              value={filterYear}
              onChange={e => setFilterYear(Number(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Filtros para 'treatment' ── */}
      {tab === 'treatment' && (
        <div className="space-y-3 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tratamiento</label>
            <select
              className="input-field py-2 text-sm"
              value={selectedTreatmentId}
              onChange={e => setSelectedTreatmentId(Number(e.target.value))}
            >
              <option value="" disabled>Selecciona un tratamiento...</option>
              {catalog.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Ver por</label>
              <select
                className="input-field py-2 text-sm"
                value={treatmentMode}
                onChange={e => setTreatmentMode(e.target.value as any)}
              >
                <option value="year">Año</option>
                <option value="month">Mes</option>
                <option value="day">Día concreto</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
              {treatmentMode === 'year' && (
                <select
                  className="input-field py-2 text-sm"
                  value={treatmentFilterYear}
                  onChange={e => setTreatmentFilterYear(Number(e.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}
              {treatmentMode === 'month' && (
                <div className="flex gap-1">
                  <select
                    className="input-field py-2 text-sm flex-1"
                    value={treatmentFilterMonth}
                    onChange={e => setTreatmentFilterMonth(Number(e.target.value))}
                  >
                    {MONTHS_NAMES.slice(1).map((name, i) => (
                      <option key={i + 1} value={i + 1}>{name.substring(0, 3)}</option>
                    ))}
                  </select>
                  <select
                    className="input-field py-2 text-sm w-20"
                    value={treatmentFilterYear}
                    onChange={e => setTreatmentFilterYear(Number(e.target.value))}
                  >
                    {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}
              {treatmentMode === 'day' && (
                <input
                  type="date"
                  className="input-field py-2 text-sm"
                  value={treatmentFilterDate}
                  onChange={e => setTreatmentFilterDate(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="text-center text-gray-400 py-8 text-sm">Cargando...</div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB: Por día ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {!isLoading && tab === 'day' && (
        <div className="space-y-3 pb-6">
          {/* Resumen total del mes */}
          {dayData.length > 0 && (
            <div className="bg-gradient-to-br from-dental-blue to-blue-600 rounded-2xl p-4 text-white shadow-lg">
              <div className="text-xs opacity-80 mb-1">
                Total {MONTHS_NAMES[filterMonth]} {filterYear}
              </div>
              <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-bold">{dayTotal.toFixed(2)}€</span>
                <span className="text-xs opacity-70">{dayData.length} días trabajados</span>
              </div>
            </div>
          )}

          {dayData.map(row => (
            <div key={row.date}>
              <button
                onClick={() => toggleDayDetail(row.date)}
                className="card w-full text-left flex items-center justify-between
                           active:scale-[0.98] transition-transform"
              >
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{formatDate(row.date)}</div>
                  <div className="text-xs text-gray-400">{row.total_treatments} tratamientos</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-dental-blue">{row.total_commission.toFixed(2)}€</span>
                  <span className={`text-gray-400 transition-transform duration-200 text-xs
                    ${expandedDay === row.date ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                </div>
              </button>

              {/* Detalle expandible */}
              {expandedDay === row.date && (
                <div className="ml-4 mt-1 space-y-1">
                  {loadingDetail ? (
                    <div className="text-xs text-gray-400 py-2">Cargando...</div>
                  ) : (
                    dayDetail.map((d, i) => (
                      <div key={i} className="flex justify-between bg-blue-50/60 rounded-xl px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">{d.treatment_name}</span>
                          <span className="text-gray-400 ml-2">×{d.quantity}</span>
                        </div>
                        <span className="font-semibold text-dental-blue">{d.total_commission.toFixed(2)}€</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}

          {dayData.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">
              No hay registros en {MONTHS_NAMES[filterMonth]} {filterYear}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB: Por mes ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {!isLoading && tab === 'month' && (
        <div className="space-y-3 pb-6">
          {monthData.map(row => (
            <div key={row.month_year} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-800">{formatMonthYear(row.month_year)}</div>
                  <div className="text-xs text-gray-400">{row.total_treatments} tratamientos</div>
                </div>
                <span className="font-bold text-dental-blue text-lg">{row.total_commission.toFixed(2)}€</span>
              </div>
              <button
                onClick={() => handleExportPdf(row.month_year)}
                disabled={exportingPdf === row.month_year}
                className="mt-3 w-full flex items-center justify-center gap-2
                           bg-dental-blue/10 text-dental-blue text-sm font-semibold
                           py-2 rounded-xl active:scale-95 transition-transform
                           disabled:opacity-50 disabled:cursor-wait"
              >
                {exportingPdf === row.month_year ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-dental-blue/30 border-t-dental-blue rounded-full" />
                    Generando PDF...
                  </>
                ) : (
                  <>
                    📄 Exportar a PDF
                  </>
                )}
              </button>
            </div>
          ))}

          {/* Total acumulado */}
          {monthData.length > 1 && (
            <div className="bg-gradient-to-br from-dental-blue to-blue-600 rounded-2xl p-4 text-white shadow-lg">
              <div className="text-xs opacity-80 mb-1">Total acumulado</div>
              <span className="text-3xl font-bold">
                {monthData.reduce((s, r) => s + r.total_commission, 0).toFixed(2)}€
              </span>
            </div>
          )}

          {monthData.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">
              Aún no hay datos mensuales
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB: Por tratamiento ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {!isLoading && tab === 'treatment' && (
        <div className="space-y-3 pb-6">
          {!selectedTreatmentId ? (
            <div className="text-center text-gray-400 py-8 text-sm">
              Selecciona un tratamiento arriba
            </div>
          ) : (
            <>
              {treatmentRecords.length > 0 && (
                <div className="bg-gradient-to-br from-dental-blue to-blue-600 rounded-2xl p-4 text-white shadow-lg">
                  <div className="text-xs opacity-80 mb-1">
                    Total {treatmentMode === 'year' ? treatmentFilterYear : treatmentMode === 'month' ? `${MONTHS_NAMES[treatmentFilterMonth]} ${treatmentFilterYear}` : formatDate(treatmentFilterDate)}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{treatmentRecordsTotal.toFixed(2)}€</span>
                    <span className="text-xs opacity-70">{treatmentRecordsQty} unidades</span>
                  </div>
                </div>
              )}

              {treatmentRecords.map((row, i) => (
                <div key={i} className="card flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{formatDate(row.date)}</div>
                    <div className="text-xs text-gray-400">{row.quantity} unidades</div>
                  </div>
                  <span className="font-bold text-dental-blue">{row.total_commission.toFixed(2)}€</span>
                </div>
              ))}

              {treatmentRecords.length === 0 && (
                <div className="text-center text-gray-400 py-8 text-sm">
                  No hay registros para las fechas seleccionadas
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
