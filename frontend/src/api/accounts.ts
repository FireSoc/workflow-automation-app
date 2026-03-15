import { api } from './client';
import type { Customer } from '../types';

export const accountsApi = {
  list: () => api.get<Customer[]>('/accounts'),
  get: (id: number) => api.get<Customer>(`/accounts/${id}`),
};
