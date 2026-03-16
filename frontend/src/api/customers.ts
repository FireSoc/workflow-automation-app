import { api } from './client';
import type { Customer, CustomerCreate } from '../types';

export const customersApi = {
  list: () => api.get<Customer[]>('/customers'),
  get: (id: number) => api.get<Customer>(`/customers/${id}`),
  create: (data: CustomerCreate) => api.post<Customer>('/customers', data),
  delete: (id: number) => api.delete(`/customers/${id}`),
};
