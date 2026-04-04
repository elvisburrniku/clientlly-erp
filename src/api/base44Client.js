const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(errorData.error || res.statusText);
    err.status = res.status;
    err.data = errorData;
    throw err;
  }

  return res.json();
}

function createEntityClient(entityName) {
  return {
    async list(sort, limit = 1000) {
      const params = new URLSearchParams();
      if (sort) params.set('_sort', sort);
      if (limit) params.set('_limit', limit);
      const qs = params.toString();
      return apiFetch(`/entities/${entityName}${qs ? `?${qs}` : ''}`);
    },

    async all(sort, limit = 10000) {
      return this.list(sort, limit);
    },

    async filter(filters = {}, sort, limit = 1000) {
      return apiFetch(`/entities/${entityName}/filter`, {
        method: 'POST',
        body: { ...filters, _sort: sort, _limit: limit },
      });
    },

    async create(data) {
      return apiFetch(`/entities/${entityName}`, {
        method: 'POST',
        body: data,
      });
    },

    async update(id, data) {
      return apiFetch(`/entities/${entityName}/${id}`, {
        method: 'PATCH',
        body: data,
      });
    },

    async delete(id) {
      return apiFetch(`/entities/${entityName}/${id}`, {
        method: 'DELETE',
      });
    },

    async get(id) {
      return apiFetch(`/entities/${entityName}/${id}`);
    },
  };
}

export const base44 = {
  auth: {
    async me() {
      return apiFetch('/auth/me');
    },

    async logout() {
      await apiFetch('/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    },

    redirectToLogin(returnUrl) {
      window.location.href = `/login${returnUrl ? `?next=${encodeURIComponent(returnUrl)}` : ''}`;
    },

    async updateMe(data) {
      return apiFetch('/auth/me', { method: 'PATCH', body: data });
    },
  },

  entities: {
    Tenant: createEntityClient('Tenant'),
    Client: createEntityClient('Client'),
    Supplier: createEntityClient('Supplier'),
    Product: createEntityClient('Product'),
    Unit: createEntityClient('Unit'),
    ServiceCategory: createEntityClient('ServiceCategory'),
    Invoice: createEntityClient('Invoice'),
    InvoiceSettings: createEntityClient('InvoiceSettings'),
    InvoiceTemplate: createEntityClient('InvoiceTemplate'),
    Quote: createEntityClient('Quote'),
    QuoteTemplate: createEntityClient('QuoteTemplate'),
    Expense: createEntityClient('Expense'),
    ExpenseCategory: createEntityClient('ExpenseCategory'),
    CategoryBudget: createEntityClient('CategoryBudget'),
    Payment: createEntityClient('Payment'),
    CashTransaction: createEntityClient('CashTransaction'),
    CashboxSettings: createEntityClient('CashboxSettings'),
    CashHandover: createEntityClient('CashHandover'),
    Transfer: createEntityClient('Transfer'),
    Inventory: createEntityClient('Inventory'),
    Reminder: createEntityClient('Reminder'),
    ReportTemplate: createEntityClient('ReportTemplate'),
    User: createEntityClient('User'),
    Department: createEntityClient('Department'),
    JobPosition: createEntityClient('JobPosition'),
    Employee: createEntityClient('Employee'),
    Attendance: createEntityClient('Attendance'),
    Shift: createEntityClient('Shift'),
    Schedule: createEntityClient('Schedule'),
    LeaveType: createEntityClient('LeaveType'),
    LeaveBalance: createEntityClient('LeaveBalance'),
    LeaveRequest: createEntityClient('LeaveRequest'),
    Payroll: createEntityClient('Payroll'),
    EmployeeAdvance: createEntityClient('EmployeeAdvance'),
    Holiday: createEntityClient('Holiday'),
    ProjectStage: createEntityClient('ProjectStage'),
    ProjectLabel: createEntityClient('ProjectLabel'),
    Project: createEntityClient('Project'),
    ProjectMember: createEntityClient('ProjectMember'),
    Milestone: createEntityClient('Milestone'),
    Task: createEntityClient('Task'),
    TaskComment: createEntityClient('TaskComment'),
    Timesheet: createEntityClient('Timesheet'),
    Bug: createEntityClient('Bug'),
    CreditNote: createEntityClient('CreditNote'),
    DebitNote: createEntityClient('DebitNote'),
    Bill: createEntityClient('Bill'),
    ExpenseRequest: createEntityClient('ExpenseRequest'),
    Revenue: createEntityClient('Revenue'),
    Lead: createEntityClient('Lead'),
    Note: createEntityClient('Note'),
    Announcement: createEntityClient('Announcement'),
    PortalToken: createEntityClient('PortalToken'),
    ServiceAppointment: createEntityClient('ServiceAppointment'),
    AssetType: createEntityClient('AssetType'),
    Asset: createEntityClient('Asset'),
    Vehicle: createEntityClient('Vehicle'),
    VehicleInsurance: createEntityClient('VehicleInsurance'),
    VehicleRegistration: createEntityClient('VehicleRegistration'),
    Driver: createEntityClient('Driver'),
    VehicleReservation: createEntityClient('VehicleReservation'),
    VehicleMaintenance: createEntityClient('VehicleMaintenance'),
    FuelLog: createEntityClient('FuelLog'),
    CustomField: createEntityClient('CustomField'),
  },

  portal: {
    async generateToken(data) {
      return apiFetch('/portal/generate-token', { method: 'POST', body: data });
    },
    async getClientPortal(token) {
      return apiFetch(`/portal/client/${token}`);
    },
    async getVendorPortal(token) {
      return apiFetch(`/portal/vendor/${token}`);
    },
  },

  merge: {
    async mergeClients(data) {
      return apiFetch('/merge/clients', { method: 'POST', body: data });
    },
    async mergeSuppliers(data) {
      return apiFetch('/merge/suppliers', { method: 'POST', body: data });
    },
  },

  functions: {
    async invoke(name, params = {}) {
      return apiFetch(`/functions/${name}`, {
        method: 'POST',
        body: params,
      });
    },
  },

  integrations: {
    Core: {
      async SendEmail(data) {
        return apiFetch('/integrations/Core/SendEmail', {
          method: 'POST',
          body: data,
        });
      },

      async UploadFile({ file }) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/integrations/Core/UploadFile`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
      },
    },
  },
};
