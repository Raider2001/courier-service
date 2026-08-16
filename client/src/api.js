/**
 * Every request goes through here so the auth cookie is always sent and
 * errors always arrive as a plain Error with the server's message.
 */
async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // No body - fine for the odd empty response.
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data;
}

const qs = (params = {}) => {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  ).toString();
  return search ? `?${search}` : '';
};

export const api = {
  me: () => request('/auth/me'),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  changePassword: (body) => request('/auth/change-password', { method: 'POST', body }),

  dashboard: () => request('/dashboard'),

  jobs: (params) => request(`/jobs${qs(params)}`),
  job: (id) => request(`/jobs/${id}`),
  createJob: (body) => request('/jobs', { method: 'POST', body }),
  updateJob: (id, body) => request(`/jobs/${id}`, { method: 'PATCH', body }),

  addresses: (params) => request(`/addresses${qs(params)}`),
  createAddress: (body) => request('/addresses', { method: 'POST', body }),
  updateAddress: (id, body) => request(`/addresses/${id}`, { method: 'PATCH', body }),
  deleteAddress: (id) => request(`/addresses/${id}`, { method: 'DELETE' }),

  customers: (params) => request(`/customers${qs(params)}`),
  customer: (id) => request(`/customers/${id}`),
  createCustomer: (body) => request('/customers', { method: 'POST', body }),
  updateCustomer: (id, body) => request(`/customers/${id}`, { method: 'PATCH', body }),

  drivers: (params) => request(`/drivers${qs(params)}`),
  createDriver: (body) => request('/drivers', { method: 'POST', body }),
  updateDriver: (id, body) => request(`/drivers/${id}`, { method: 'PATCH', body }),
};
