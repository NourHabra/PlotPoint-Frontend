import type { Template } from "@/types/template";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Attach Authorization header from localStorage if present (client-side)
  const authHeader = (() => {
    if (typeof window === 'undefined') return {} as Record<string, string>;
    try {
      const raw = localStorage.getItem('auth');
      if (!raw) return {} as Record<string, string>;
      const a = JSON.parse(raw);
      if (a?.token) return { Authorization: `Bearer ${a.token}` } as Record<string, string>;
      return {} as Record<string, string>;
    } catch {
      return {} as Record<string, string>;
    }
  })();

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.message ?? `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, error instanceof Error ? error.message : 'Network error');
  }
}

// Template API functions
export const templateApi = {
  // Get all templates
  getAll: (includeInactive = false): Promise<Template[]> =>
    apiRequest<Template[]>(`/templates?includeInactive=${includeInactive}`),

  // Get template by ID
  getById: (id: string): Promise<Template> => apiRequest<Template>(`/templates/${id}`),

  // Create new template
  create: (templateData: any) => apiRequest('/templates', {
    method: 'POST',
    body: JSON.stringify(templateData),
  }),

  // Update template
  update: (id: string, templateData: any) => apiRequest(`/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(templateData),
  }),

  // Delete template (soft delete)
  delete: (id: string) => apiRequest(`/templates/${id}`, {
    method: 'DELETE',
  }),

  // Reactivate template
  reactivate: (id: string) => apiRequest(`/templates/${id}/reactivate`, {
    method: 'PATCH',
  }),

  // Import DOCX template
  importDocx: async (name: string, description: string, file: File, variables: any[], requiresKml: boolean, variableGroups?: any[]) => {
    const url = `${API_BASE_URL}/templates/import-docx`;
    const form = new FormData();
    form.append('name', name);
    if (description) form.append('description', description);
    form.append('file', file);
    form.append('variables', JSON.stringify(variables));
    form.append('requiresKml', String(requiresKml));
    if (variableGroups && variableGroups.length) form.append('variableGroups', JSON.stringify(variableGroups));
    const res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message ?? 'Import failed');
    }
    return res.json();
  },

  // Analyze a tokenized DOCX to extract variables and media
  analyzeDocx: async (file: File) => {
    const url = `${API_BASE_URL}/templates/analyze-docx`;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message ?? 'Analyze failed');
    }
    return res.json() as Promise<{
      uploadedPath: string;
      variables: Array<{ id: string; name: string }>;
      media: Array<{ target: string; fileName?: string; extent?: { cx: number; cy: number } }>;
    }>;
  },

  // Finalize import using an already tokenized DOCX stored on the server
  finalizeImport: async (payload: {
    name: string;
    description?: string;
    requiresKml?: boolean;
    variableGroups?: Array<{ id: string; name: string; description?: string; order?: number }>;
    variables: any[];
    sourceDocxPath: string;
  }) => {
    return apiRequest(`/templates/finalize-import`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Upload an image for image variables
  uploadImage: async (file: File) => {
    const url = `${API_BASE_URL}/uploads/image`;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message ?? 'Upload failed');
    }
    return res.json() as Promise<{ filename: string; url: string }>;
  },

  // Extract values from PDF
  extractPdf: async (file: File) => {
    const url = `${API_BASE_URL}/uploads/extract-pdf`;
    const form = new FormData();
    form.append('file', file);
    // Attach Authorization header
    const authHeaders = (() => {
      if (typeof window === 'undefined') return {} as Record<string, string>;
      try {
        const raw = localStorage.getItem('auth');
        if (!raw) return {} as Record<string, string>;
        const a = JSON.parse(raw);
        if (a?.token) return { Authorization: `Bearer ${a.token}` } as Record<string, string>;
        return {} as Record<string, string>;
      } catch {
        return {} as Record<string, string>;
      }
    })();
    const res = await fetch(url, { method: 'POST', body: form, headers: authHeaders });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message ?? 'PDF extraction failed');
    }
    const data = await res.json();
    return data.extractedValues as Record<string, string>;
  },

  // Generate report
  generate: async (id: string, values: Record<string, any>, output: 'docx' | 'pdf', kmlData?: Record<string, any>) => {
    const url = `${API_BASE_URL}/templates/${id}/generate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values, output, ...(kmlData ? { kmlData } : {}) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message ?? 'Generation failed');
    }
    const blob = await res.blob();
    return blob;
  },

  // HTML preview for imported DOCX
  previewHtml: async (id: string, values: Record<string, any>) => {
    const url = `${API_BASE_URL}/templates/${id}/preview-html`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message ?? 'Preview failed');
    }
    const data = await res.json();
    return data.html as string;
  },
};

// Auth API
export const authApi = {
  register: async (payload: { name: string; email: string; password: string; role: 'Admin' | 'User'; avatar?: File | null }, adminToken?: string) => {
    const url = `${API_BASE_URL}/auth/register`;
    const form = new FormData();
    form.append('name', payload.name);
    form.append('email', payload.email);
    form.append('password', payload.password);
    form.append('role', payload.role);
    if (payload.avatar) form.append('avatar', payload.avatar);
    const headers: Record<string, string> = {};
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    const res = await fetch(url, { method: 'POST', body: form, headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message ?? 'Register failed');
    }
    return res.json();
  },
  login: async (payload: { email: string; password: string }): Promise<{ id: string; name: string; email: string; role: 'Admin' | 'User'; avatarUrl: string; token: string; }> =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  listUsers: async () => apiRequest<UserDto[]>('/users'),
  me: async (): Promise<UserDto> => apiRequest<UserDto>('/users/me'),
};

// Report API functions
export const reportApi = {
  create: (payload: { templateId: string; name?: string; title?: string; values: Record<string, any>; createdBy?: string }) =>
    apiRequest('/reports', { method: 'POST', body: JSON.stringify(payload) }),

  getAll: () => apiRequest('/reports'),
  getAllReportsAdmin: () => apiRequest('/reports/all'),
  getById: (id: string) => apiRequest(`/reports/${id}`),
  update: (id: string, payload: Partial<{ name: string; title: string; status: string; values: Record<string, any>; isArchived: boolean; kmlData: Record<string, any>; checklistProgress: Array<{ id: string; checked: boolean }>; checklistStatus: 'empty' | 'partial' | 'complete' }>) =>
    apiRequest(`/reports/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Generate from a saved report
  generate: async (id: string, output: 'docx' | 'pdf') => {
    const url = `${API_BASE_URL}/reports/${id}/generate`;
    // Attach Authorization header from localStorage if present
    const authHeaders = (() => {
      if (typeof window === 'undefined') return {} as Record<string, string>;
      try {
        const raw = localStorage.getItem('auth');
        if (!raw) return {} as Record<string, string>;
        const a = JSON.parse(raw);
        if (a?.token) return { Authorization: `Bearer ${a.token}` } as Record<string, string>;
        return {} as Record<string, string>;
      } catch {
        return {} as Record<string, string>;
      }
    })();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ output }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message ?? 'Report generation failed');
    }
    return res.blob();
  },

  delete: (id: string) => apiRequest(`/reports/${id}`, { method: 'DELETE' }),

  // Appendix endpoints
  listAppendix: (reportId: string) => apiRequest(`/reports/${reportId}/appendix`),
  uploadAppendix: async (reportId: string, files: File[]) => {
    const url = `${API_BASE_URL}/reports/${encodeURIComponent(reportId)}/appendix/upload`;
    const form = new FormData();
    for (const f of files) form.append('files', f);
    // Attach Authorization header
    const authHeaders = (() => {
      if (typeof window === 'undefined') return {} as Record<string, string>;
      try {
        const raw = localStorage.getItem('auth');
        if (!raw) return {} as Record<string, string>;
        const a = JSON.parse(raw);
        if (a?.token) return { Authorization: `Bearer ${a.token}` } as Record<string, string>;
        return {} as Record<string, string>;
      } catch {
        return {} as Record<string, string>;
      }
    })();
    const res = await fetch(url, { method: 'POST', body: form, headers: authHeaders });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message ?? 'Appendix upload failed');
    }
    return res.json();
  },
  reorderAppendix: (reportId: string, items: Array<{ itemId: string; order: number }>) =>
    apiRequest(`/reports/${reportId}/appendix/order`, { method: 'PATCH', body: JSON.stringify(items) }),
  deleteAppendixItem: (reportId: string, itemId: string) =>
    apiRequest(`/reports/${reportId}/appendix/${itemId}`, { method: 'DELETE' }),
};

// Changelog API
export const changelogApi = {
  list: () => apiRequest('/changelog'),
  create: (payload: { title: string; description: string; date: string }) => apiRequest('/changelog', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<{ title: string; description: string; date: string; disabled: boolean }>) => apiRequest(`/changelog/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id: string) => apiRequest(`/changelog/${id}`, { method: 'DELETE' }),
};

// Generation Stats API (admin only)
export const generationStatsApi = {
  list: (page = 1, limit = 25) => apiRequest(`/admin/generation-stats?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`),
};

// Dashboard API
export const dashboardApi = {
  getSummary: () => apiRequest('/dashboard/reports/summary'),
  getLatest: (limit = 10) => apiRequest(`/dashboard/reports/latest?limit=${limit}`),
};

// Support Tickets API
export const ticketApi = {
  create: (payload: { title: string; contactName: string; contactEmail: string; phoneCountryCode?: string; phoneNumber?: string; message: string }) =>
    apiRequest('/tickets', { method: 'POST', body: JSON.stringify(payload) }),
  getAll: () => apiRequest('/tickets'),
  // Admin endpoints (not used on user Support page, but available)
  getAllAdmin: () => apiRequest('/tickets/all'),
  hasOpenAdmin: () => apiRequest<{ hasOpen: boolean; count: number }>('/tickets/has-open'),
  update: (id: string, payload: Partial<{ status: 'Open' | 'Resolved'; adminResponse: string }>) =>
    apiRequest(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  withdraw: (id: string) => apiRequest(`/tickets/${id}/withdraw`, { method: 'POST' }),
};

// User Templates (per-user customizations)
export interface UserTemplateDto {
  _id: string;
  userId: string;
  templateId: string;
  variableTextTemplates: Array<{
    variableId: string;
    snippets: Array<{ id: string; text: string }>;
  }>;
  variableSelectOptions?: Array<{
    variableId: string;
    options: Array<{ id: string; value: string }>;
  }>;
  checklist: Array<{ id: string; label: string; required?: boolean; order: number }>;
  createdAt?: string;
  updatedAt?: string;
}

export const userTemplateApi = {
  getForTemplate: (templateId: string) => apiRequest<UserTemplateDto>(`/user-templates?templateId=${encodeURIComponent(templateId)}`),
  createForTemplate: (templateId: string, init?: Partial<Pick<UserTemplateDto, 'variableTextTemplates' | 'variableSelectOptions' | 'checklist'>>) =>
    apiRequest<UserTemplateDto>(`/user-templates`, { method: 'POST', body: JSON.stringify({ templateId, ...(init || {}) }) }),
  getById: (id: string) => apiRequest<UserTemplateDto>(`/user-templates/${id}`),
  update: (id: string, payload: Partial<Pick<UserTemplateDto, 'variableTextTemplates' | 'variableSelectOptions' | 'checklist'>>) =>
    apiRequest<UserTemplateDto>(`/user-templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
};

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'User';
  avatarUrl: string;
  createdAt?: string;
}

// Cadastral API
export interface RegionOption {
  vilCode: number;
  distCode: number;
  name: string;
}

export const cadastralApi = {
  // Get regions for a province
  getRegions: (provinceCode: string) =>
    apiRequest<{ regions: RegionOption[] }>(`/cadastral/provinces/${encodeURIComponent(provinceCode)}/regions`),

  // Get quarters for a region
  getQuarters: (distCode: number, vilCode: number) =>
    apiRequest<{ quarters: Array<{ qrtrCode: number; qrtrName: string | null }> }>(`/cadastral/regions/${distCode}/${vilCode}/qrtr-code`),

  // Get sheets for a region
  getSheets: (distCode: number, vilCode: number, qrtrCode: number) =>
    apiRequest<{ sheets: string[] }>(`/cadastral/sheets?distCode=${distCode}&vilCode=${vilCode}&qrtrCode=${qrtrCode}`),

  // Get plans for a sheet
  getPlans: (distCode: number, vilCode: number, qrtrCode: number, sheet: string) =>
    apiRequest<{ plans: string[] }>(`/cadastral/plans?distCode=${distCode}&vilCode=${vilCode}&qrtrCode=${qrtrCode}&sheet=${encodeURIComponent(sheet)}`),

  // Get sections (BLCK_CODE) for a plan
  getSections: (distCode: number, vilCode: number, qrtrCode: number, sheet: string, planNbr: string) =>
    apiRequest<{ sections: string[] }>(`/cadastral/sections?distCode=${distCode}&vilCode=${vilCode}&qrtrCode=${qrtrCode}&sheet=${encodeURIComponent(sheet)}&planNbr=${encodeURIComponent(planNbr)}`),

  // Query parcel
  queryParcel: (params: {
    distCode: number;
    vilCode: number;
    qrtrCode: number;
    sheet: string;
    planNbr: string;
    parcelNbr: string;
  }) =>
    apiRequest<{
      success: boolean;
      sbpiIdNo: number | null;
      data: any;
      parcelDetails: any;
    }>('/cadastral/query', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};