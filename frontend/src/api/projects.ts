import { api } from './client';
import type {
  Project,
  ProjectCreate,
  ProjectDetail,
  ProjectSummaryResponse,
  RiskRead,
  Task,
  OnboardingEvent,
  OverdueCheckResponse,
  RiskCheckResponse,
  Recommendation,
} from '../types';

export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: number) => api.get<ProjectDetail>(`/projects/${id}`),
  create: (data: ProjectCreate) => api.post<Project>('/projects', data),
  tasks: (id: number) => api.get<Task[]>(`/projects/${id}/tasks`),
  events: (id: number) => api.get<OnboardingEvent[]>(`/projects/${id}/events`),
  checkOverdue: (id: number) => api.post<OverdueCheckResponse>(`/projects/${id}/check-overdue`),
  checkRisk: (id: number) => api.post<RiskCheckResponse>(`/projects/${id}/check-risk`),
  getRisk: (id: number) => api.get<RiskRead>(`/projects/${id}/risk`),
  recalculateRisk: (id: number) => api.post<RiskRead>(`/projects/${id}/risk/recalculate`),
  getSummary: (id: number) => api.get<ProjectSummaryResponse>(`/projects/${id}/summary`),
  advanceStage: (id: number) =>
    api.post<{ advanced: boolean; new_stage: string | null; project_completed: boolean; message: string }>(
      `/projects/${id}/advance-stage`
    ),
  recommendations: (id: number) => api.get<Recommendation[]>(`/projects/${id}/recommendations`),
  dismissRecommendation: (projectId: number, recommendationId: number) =>
    api.post<Recommendation>(`/projects/${projectId}/recommendations/${recommendationId}/dismiss`),
};
