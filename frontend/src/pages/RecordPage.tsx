import { useEffect, useState, useCallback } from 'react'
import { api, Treatment, RecordItem } from '../api'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function toDateString(d: Date) {
  return d.toISOString().split('T')[0]
}

function isToday(d: Date) {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

export default function RecordPage() {
  const [catalog, setCatalog] = useState<Treatment[]>([])
  const [records, setRecords] = useState<RecordItem[]>([])
  
  // Función para obtener el día laborable más cercano (Lun-Jue)
  const getNearestWorkingDay = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    if (day === 5) d.setDate(d.getDate() + 3) // Viernes -> Lunes
    else if (day === 6) d.setDate(d.getDate() + 2) // Sábado -> Lunes
    else if (day === 0) d.setDate(d.getDate() + 1) // Domingo -> Lunes
    return d
  }

  const [selectedDate, setSelectedDate] = useState<Date>(getNearestWorkingDay(new Date()))

  const [selectedTreatmentId, setSelectedTreatmentId] = useState<number | ''>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const dayName = DAYS[selectedDate.getDay()]
  const dayNum = selectedDate.getDate()
  const monthName = MONTHS[selectedDate.getMonth()]
  const year = selectedDate.getFullYear()

  const loadData = useCallback(async () => {
    try {
      const dateStr = toDateString(selectedDate)
      const [catData, recData] = await Promise.all([
        api.fetchCatalog(),
        api.fetchRecordsByDate(dateStr)
      ])
      setCatalog(catData.filter(t => t.active))
      setRecords(recData)
    } catch (err) {
      console.error(err)
    }
  }, [selectedDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const goDay = (offset: number) => {
    setSelectedDate(prev => {
      const d = new Date(prev)
      const currentDay = d.getDay()
      
      if (offset > 0) {
        // Ir hacia adelante
        if (currentDay === 4) d.setDate(d.getDate() + 4) // Jueves -> Lunes (+4)
        else d.setDate(d.getDate() + 1)
      } else {
        // Ir hacia atrás
        if (currentDay === 1) d.setDate(d.getDate() - 4) // Lunes -> Jueves (-4)
        else d.setDate(d.getDate() - 1)
      }
      return d
    })
  }

  const goToday = () => setSelectedDate(getNearestWorkingDay(new Date()))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTreatmentId || quantity < 1) return

    setIsSubmitting(true)
    try {
      await api.createRecord(toDateString(selectedDate), Number(selectedTreatmentId), quantity)

      setSelectedTreatmentId('')
      setQuantity(1)
      await loadData()
    } catch (error) {
      alert("Error al guardar el registro")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    try {
      await api.deleteRecord(id);
      await loadData();
    } catch (error) {
      alert("Error al eliminar el registro");
    }
  }

  const todayTotal = records.reduce((acc, curr) => acc + curr.total_commission, 0)
  const todayTotalTreatments = records.reduce((acc, curr) => acc + curr.quantity, 0)

  return (
    <div className="space-y-6">

      {/* ── Fecha con navegación ── */}
      <div className="text-center py-2">
        <div className="flex items-center justify-center gap-4 mb-1">
          <button
            onClick={() => goDay(-1)}
            className="w-10 h-10 rounded-full bg-dental-blue/10 text-dental-blue
                       flex items-center justify-center text-xl font-bold
                       active:scale-90 transition-transform"
            aria-label="Día anterior"
          >
            ‹
          </button>

          <div className="min-w-[180px]">
            <div className="text-2xl font-bold text-dental-blue capitalize">{dayName}</div>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-extrabold text-gray-800">{dayNum}</span>
              <span className="text-xl font-semibold text-gray-500">{monthName} {year}</span>
            </div>
          </div>

          <button
            onClick={() => goDay(1)}
            className="w-10 h-10 rounded-full bg-dental-blue/10 text-dental-blue
                       flex items-center justify-center text-xl font-bold
                       active:scale-90 transition-transform"
            aria-label="Día siguiente"
          >
            ›
          </button>
        </div>

        {!isToday(selectedDate) && (
          <button
            onClick={goToday}
            className="text-xs text-dental-blue font-semibold bg-dental-blue/10
                       px-3 py-1 rounded-full active:scale-95 transition-transform"
          >
            Ir a hoy
          </button>
        )}
      </div>

      {/* ── Resumen del día ── */}
      <div className="bg-dental-blue rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 text-9xl -mt-4 -mr-4">🦷</div>
        <h2 className="text-sm font-medium opacity-90 mb-1">
          {isToday(selectedDate) ? 'Resumen de hoy' : `Resumen del ${dayNum} de ${monthName}`}
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{todayTotal.toFixed(2)}€</span>
          <span className="text-sm opacity-80">en comisiones</span>
        </div>
        <div className="mt-4 text-sm bg-white/20 inline-block px-3 py-1 rounded-full">
          {todayTotalTreatments} tratamientos realizados
        </div>
      </div>

      {/* ── Formulario ── */}
      <h2 className="text-lg font-bold text-gray-800">Añadir trabajo</h2>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento</label>
          <select
            className="input-field"
            value={selectedTreatmentId}
            onChange={(e) => setSelectedTreatmentId(Number(e.target.value))}
            required
          >
            <option value="" disabled>Selecciona un trabajo realizado...</option>
            {catalog.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
          <input
            type="number"
            min="1"
            className="input-field"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting || selectedTreatmentId === ''}
        >
          {isSubmitting ? 'Guardando...' : 'Añadir Registro'}
        </button>
      </form>

      {/* ── Registros del día ── */}
      {records.length > 0 && (
        <div className="space-y-3 pb-4">
          <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider">
            {isToday(selectedDate) ? 'Registros de hoy' : `Registros del ${dayNum}/${selectedDate.getMonth() + 1}`}
          </h3>
          {records.map(r => {
            const treatment = catalog.find(t => t.id === r.treatment_id) || { name: 'Tratamiento' }
            return (
              <div key={r.id} className="card flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-800">{treatment.name}</div>
                  <div className="text-xs text-gray-500">Cantidad: {r.quantity}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-bold text-dental-blue">
                    +{r.total_commission.toFixed(2)}€
                  </div>
                  <button 
                    onClick={() => handleDelete(r.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 active:scale-95 transition-all outline-none focus:outline-none"
                    title="Eliminar registro"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {records.length === 0 && (
        <div className="text-center text-gray-400 py-6 text-sm">
          No hay registros para este día
        </div>
      )}

    </div>
  )
}
