import { api } from './client';
import type {
  SimulationRequest,
  SimulationResponse,
  SimulationCompareRequest,
  SimulationCompareResponse,
  SimulationAssumptions,
  ProjectBaselineResponse,
} from '../types';

export const simulationsApi = {
  run: (payload: SimulationRequest) =>
    api.post<SimulationResponse>('/simulations/risk', payload),

  getProjectBaseline: (projectId: number) =>
    api.get<ProjectBaselineResponse>(`/simulations/project/${projectId}/baseline`),

  runFromProject: (projectId: number, assumptions?: SimulationAssumptions) =>
    api.post<SimulationResponse>(
      `/simulations/risk/from-project/${projectId}`,
      assumptions ?? {},
    ),

  compare: (payload: SimulationCompareRequest) =>
    api.post<SimulationCompareResponse>('/simulations/risk/compare', payload),
};
