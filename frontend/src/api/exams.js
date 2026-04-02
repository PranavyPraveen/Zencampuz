import api from './axios';
const unpack = (r) => r.data.results ?? r.data;

export const examsApi = {
  // Plans
  getPlans: async (params) => unpack(await api.get('/exams/plans/', { params })),
  getPlan: async (id) => (await api.get(`/exams/plans/${id}/`)).data,
  createPlan: async (data) => (await api.post('/exams/plans/', data)).data,
  updatePlan: async (id, data) => (await api.put(`/exams/plans/${id}/`, data)).data,
  deletePlan: async (id) => (await api.delete(`/exams/plans/${id}/`)).data,
  publishPlan: async (id, notes) => (await api.post(`/exams/plans/${id}/publish/`, { notes })).data,

  // Sessions
  getSessions: async (params) => unpack(await api.get('/exams/sessions/', { params })),
  createSession: async (data) => (await api.post('/exams/sessions/', data)).data,
  deleteSession: async (id) => (await api.delete(`/exams/sessions/${id}/`)).data,

  // Course Assignments (linking course sections to sessions)
  getCourseAssignments: async (params) => unpack(await api.get('/exams/course-assignments/', { params })),
  createCourseAssignment: async (data) => (await api.post('/exams/course-assignments/', data)).data,
  deleteCourseAssignment: async (id) => (await api.delete(`/exams/course-assignments/${id}/`)).data,

  // Hall Allocations (booking rooms for sessions)
  getHallAllocations: async (params) => unpack(await api.get('/exams/hall-allocations/', { params })),
  createHallAllocation: async (data) => (await api.post('/exams/hall-allocations/', data)).data,
  deleteHallAllocation: async (id) => (await api.delete(`/exams/hall-allocations/${id}/`)).data,

  // Seating Plans (splitting assigned courses among allocated halls)
  getSeatingPlans: async (params) => unpack(await api.get('/exams/seating-plans/', { params })),
  getSeatingBySession: async (sessionId) => (await api.get(`/exams/seating-plans/by-session/`, { params: { session_id: sessionId }})).data,
  createSeatingPlan: async (data) => (await api.post('/exams/seating-plans/', data)).data,
  updateSeatingPlan: async (id, data) => (await api.put(`/exams/seating-plans/${id}/`, data)).data,
  deleteSeatingPlan: async (id) => (await api.delete(`/exams/seating-plans/${id}/`)).data,

  // Invigilators
  getInvigilatorAssignments: async (params) => unpack(await api.get('/exams/invigilators/', { params })),
  createInvigilatorAssignment: async (data) => (await api.post('/exams/invigilators/', data)).data,
  deleteInvigilatorAssignment: async (id) => (await api.delete(`/exams/invigilators/${id}/`)).data,

  // Logs
  getLogs: async (params) => unpack(await api.get('/exams/publish-logs/', { params })),
};
