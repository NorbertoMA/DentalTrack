import { useEffect, useState } from 'react'
import { api, Treatment } from '../api'

export default function SettingsPage() {
  const [catalog, setCatalog] = useState<Treatment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Estado para nuevo tratamiento
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState<number>(0)
  const [newCommission, setNewCommission] = useState<number>(10)
  const [isCreating, setIsCreating] = useState(false)

  const loadData = async () => {
    try {
      const data = await api.fetchCatalog()
      setCatalog(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleLocalChange = (id: number, field: keyof Treatment, value: any) => {
    const parsedValue = value === '' ? 0 : value
    setCatalog(prev => prev.map(t => t.id === id ? { ...t, [field]: parsedValue } : t))
  }

  const handlePriceChange = (id: number, value: string) => {
    const price = value === '' ? 0 : parseFloat(value)
    const item = catalog.find(t => t.id === id)
    if (!item) return
    // Recalcular commission_value como porcentaje del nuevo precio
    setCatalog(prev => prev.map(t => t.id === id ? { ...t, price } : t))
  }

  const handleBlur = async (id: number, field: keyof Treatment) => {
    const item = catalog.find(t => t.id === id)
    if (!item) return
    try {
      await api.updateTreatment(id, { [field]: item[field] })
    } catch (err) {
      alert("Error al guardar en el servidor")
      loadData() // Re-fetch to undo
    }
  }

  const handleToggleActive = async (id: number, value: boolean) => {
    handleLocalChange(id, 'active', value)
    try {
      await api.updateTreatment(id, { active: value })
    } catch (err) {
      alert("Error al actualizar estado")
      loadData()
    }
  }

  const handleCreateTreatment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setIsCreating(true)
    try {
      await api.createTreatment({
        name: newName.trim(),
        price: newPrice,
        commission_value: newCommission,
        active: true,
      })
      setNewName('')
      setNewPrice(0)
      setNewCommission(10)
      setShowNew(false)
      await loadData()
    } catch (err) {
      alert("Error al crear tratamiento")
    } finally {
      setIsCreating(false)
    }
  }

  // Calcular comisión en € a partir del porcentaje
  const calcCommissionEur = (price: number, pct: number) => {
    return (price * pct / 100).toFixed(2)
  }

  if (isLoading) return <div className="p-4 text-center text-gray-500">Cargando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Catálogo y Precios</h2>
          <p className="text-sm text-gray-500">
            Los cambios se guardan automáticamente al salir del campo.
          </p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="bg-dental-blue text-white text-sm font-semibold px-4 py-2 rounded-xl
                     active:scale-95 transition-transform duration-150 whitespace-nowrap"
        >
          {showNew ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>

      {/* ── Formulario nuevo tratamiento ── */}
      {showNew && (
        <form onSubmit={handleCreateTreatment} className="card space-y-3 border-2 border-dental-blue/20">
          <h3 className="font-semibold text-dental-blue text-sm">Nuevo tratamiento</h3>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
            <input
              type="text"
              className="input-field py-2 text-sm"
              placeholder="Ej: Ortodoncia"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Precio (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field py-2 text-sm"
                value={newPrice}
                onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Comisión (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="input-field py-2 text-sm bg-blue-50/50 border-blue-100"
                value={newCommission}
                onChange={(e) => setNewCommission(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          {newPrice > 0 && (
            <div className="text-xs text-gray-500 bg-dental-light rounded-lg px-3 py-2">
              💰 Comisión resultante: <strong>{calcCommissionEur(newPrice, newCommission)}€</strong> por unidad
            </div>
          )}
          <button
            type="submit"
            className="btn-primary text-sm"
            disabled={isCreating || !newName.trim()}
          >
            {isCreating ? 'Creando...' : 'Crear tratamiento'}
          </button>
        </form>
      )}
      
      {/* ── Lista del catálogo ── */}
      <div className="space-y-3 pb-8">
        {catalog.map(item => (
          <div key={item.id} className={`card ${!item.active ? 'opacity-60 grayscale' : ''}`}>
            
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-dental-blue">{item.name}</h3>
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                <span className="text-xs">Activo</span>
                <input 
                  type="checkbox" 
                  checked={item.active}
                  onChange={(e) => handleToggleActive(item.id, e.target.checked)}
                  className="w-4 h-4 text-dental-blue rounded"
                />
              </label>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Precio (€)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="input-field py-2 text-sm"
                  value={item.price}
                  onChange={(e) => handlePriceChange(item.id, e.target.value)}
                  onBlur={() => handleBlur(item.id, 'price')}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Comisión (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  max="100"
                  className="input-field py-2 text-sm bg-blue-50/50 border-blue-100"
                  value={item.commission_value}
                  onChange={(e) => handleLocalChange(item.id, 'commission_value', parseFloat(e.target.value) || 0)}
                  onBlur={() => handleBlur(item.id, 'commission_value')}
                />
              </div>
            </div>

            {/* Vista previa de la comisión en euros */}
            <div className="mt-2 text-xs text-gray-400">
              💰 {calcCommissionEur(item.price, item.commission_value)}€ por unidad
            </div>
            
          </div>
        ))}
      </div>
    </div>
  )
}
