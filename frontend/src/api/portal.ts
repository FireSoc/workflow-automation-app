import { api } from './client';
import type { CustomerPortalProjectView } from '../types';

export const portalApi = {
  getProject: (projectId: number) =>
    api.get<CustomerPortalProjectView>(`/customer-portal/projects/${projectId}`),
};
