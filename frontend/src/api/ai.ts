import { api } from './client';
import type {
  RiskSummaryResponse,
  SimulationRecommendationsRequest,
  SimulationRecommendationsResponse,
} from '../types';

export const aiApi = {
  getRiskSummary: (projectId: number) =>
    api.get<RiskSummaryResponse>(`/projects/${projectId}/risk/ai-summary`),

  getSimulationRecommendations: (payload: SimulationRecommendationsRequest) =>
    api.post<SimulationRecommendationsResponse>('/ai/simulation/recommendations', payload),
};
