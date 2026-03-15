import { api } from './client';
import type { DealIngestPayload } from '../types';
import type { Project } from '../types';

interface IngestResponse {
  deal: { id: number; company_name: string; deal_status: string };
  customer_id: number;
  project: Project;
  message: string;
}

export const crmApi = {
  ingestDeal: (payload: DealIngestPayload) =>
    api.post<IngestResponse>('/crm/deals/ingest', payload),
};
