import { api } from './client';
import type { OnboardingPlaybook } from '../types';

export const playbooksApi = {
  list: () => api.get<OnboardingPlaybook[]>('/playbooks'),
  get: (id: number) => api.get<OnboardingPlaybook>(`/playbooks/${id}`),
};
