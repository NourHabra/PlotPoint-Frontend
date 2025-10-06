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

  // Generate report
  generate: async (id: string, values: Record<string, any>, output: 'docx' | 'pdf') => {
    const url = `${API_BASE_URL}/templates/${id}/generate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values, output }),
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