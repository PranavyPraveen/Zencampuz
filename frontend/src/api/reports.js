import api from './axios';

export const reportsApi = {
  // Calendar
  getUnifiedCalendar: async (params) => (await api.get('/reports/calendar/', { params })).data,
  
  // Metrics & Reports
  getSystemSummary: async () => (await api.get('/reports/metrics/system-summary/')).data,
  getRoomUtilization: async () => (await api.get('/reports/metrics/room-utilization/')).data,
  getFacultyWorkload: async () => (await api.get('/reports/metrics/faculty-workload/')).data,
};
