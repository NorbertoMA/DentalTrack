export const API_BASE = '/api';

export interface Treatment {
  id: number;
  name: string;
  price: number;
  commission_value: number;
  active: boolean;
}

export interface RecordItem {
  id: number;
  date: string;
  treatment_id: number;
  quantity: number;
  total_commission: number;
}

// ── Report types ─────────────────────────────────────────────────────────────

export interface DayReport {
  date: string;
  total_treatments: number;
  total_commission: number;
}

export interface DayDetail {
  treatment_name: string;
  quantity: number;
  total_commission: number;
}

export interface MonthReport {
  month_year: string;
  total_treatments: number;
  total_commission: number;
}

export interface TreatmentReport {
  treatment_id: number;
  treatment_name: string;
  total_quantity: number;
  total_commission: number;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const CATALOG_ORDER = [
  'limpieza normal',
  'limpieza profunda',
  '1º blanqueamiento',
  '2º blanqueamiento',
  'revelador',
  'fluorizacion'
];

export function sortCatalog(catalog: Treatment[]): Treatment[] {
  return [...catalog].sort((a, b) => {
    const idxA = CATALOG_ORDER.indexOf(a.name.toLowerCase());
    const idxB = CATALOG_ORDER.indexOf(b.name.toLowerCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

export const api = {
  // Catalog
  async fetchCatalog(): Promise<Treatment[]> {
    const res = await fetch(`${API_BASE}/catalog/`);
    if (!res.ok) throw new Error('Failed to fetch catalog');
    const data = await res.json();
    return sortCatalog(data);
  },

  async createTreatment(data: Omit<Treatment, 'id'>): Promise<Treatment> {
    const res = await fetch(`${API_BASE}/catalog/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create treatment');
    return res.json();
  },

  async updateTreatment(id: number, data: Partial<Treatment>): Promise<Treatment> {
    const res = await fetch(`${API_BASE}/catalog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update treatment');
    return res.json();
  },

  // Records
  async fetchTodayRecords(): Promise<RecordItem[]> {
    const res = await fetch(`${API_BASE}/records/today`);
    if (!res.ok) throw new Error('Failed to fetch today records');
    return res.json();
  },

  async fetchRecordsByDate(date: string): Promise<RecordItem[]> {
    const res = await fetch(`${API_BASE}/records/by-date?target_date=${date}`);
    if (!res.ok) throw new Error('Failed to fetch records by date');
    return res.json();
  },

  async createRecord(date: string, treatment_id: number, quantity: number): Promise<RecordItem> {
    const res = await fetch(`${API_BASE}/records/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, treatment_id, quantity }),
    });
    if (!res.ok) throw new Error('Failed to create record');
    return res.json();
  },

  async deleteRecord(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/records/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete record');
  },

  // Reports
  async fetchReportByDay(month?: number, year?: number): Promise<DayReport[]> {
    const params = new URLSearchParams();
    if (month !== undefined) params.set('month', String(month));
    if (year !== undefined) params.set('year', String(year));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/reports/by-day${qs}`);
    if (!res.ok) throw new Error('Failed to fetch day report');
    return res.json();
  },

  async fetchDayDetail(date: string): Promise<DayDetail[]> {
    const res = await fetch(`${API_BASE}/reports/day-detail?target_date=${date}`);
    if (!res.ok) throw new Error('Failed to fetch day detail');
    return res.json();
  },

  async fetchReportByMonth(): Promise<MonthReport[]> {
    const res = await fetch(`${API_BASE}/reports/by-month`);
    if (!res.ok) throw new Error('Failed to fetch month report');
    return res.json();
  },

  async fetchReportByTreatment(month?: number, year?: number): Promise<TreatmentReport[]> {
    const params = new URLSearchParams();
    if (month !== undefined) params.set('month', String(month));
    if (year !== undefined) params.set('year', String(year));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/reports/by-treatment${qs}`);
    if (!res.ok) throw new Error('Failed to fetch treatment report');
    return res.json();
  },

  async fetchTreatmentDetails(
    treatment_id: number,
    year?: number,
    month?: number,
    day_date?: string
  ): Promise<{date: string, quantity: number, total_commission: number}[]> {
    const params = new URLSearchParams();
    params.set('treatment_id', String(treatment_id));
    if (year !== undefined) params.set('year', String(year));
    if (month !== undefined) params.set('month', String(month));
    if (day_date) params.set('day_date', day_date);

    const res = await fetch(`${API_BASE}/reports/treatment-records?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch treatment detail records');
    return res.json();
  },
};
