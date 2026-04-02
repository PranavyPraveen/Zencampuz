import api from './axios';

const unpack = (r) => r.data?.results ?? r.data;

export const timetableApi = {
  // Working Days
  getWorkingDays: async (params) => unpack(await api.get('/timetable/working-days/', { params })),
  createWorkingDay: async (data) => (await api.post('/timetable/working-days/', data)).data,
  updateWorkingDay: async (id, data) => (await api.put(`/timetable/working-days/${id}/`, data)).data,
  deleteWorkingDay: async (id) => (await api.delete(`/timetable/working-days/${id}/`)).data,
  initDefaultDays: async () => (await api.post('/timetable/working-days/init-defaults/')).data,

  // Time Slot Templates
  getTimeSlots: async (params) => unpack(await api.get('/timetable/timeslot-templates/', { params })),
  createTimeSlot: async (data) => (await api.post('/timetable/timeslot-templates/', data)).data,
  updateTimeSlot: async (id, data) => (await api.put(`/timetable/timeslot-templates/${id}/`, data)).data,
  deleteTimeSlot: async (id) => (await api.delete(`/timetable/timeslot-templates/${id}/`)).data,

  // Plans
  getPlans: async (params) => unpack(await api.get('/timetable/plans/', { params })),
  getPlan: async (id) => (await api.get(`/timetable/plans/${id}/`)).data,
  createPlan: async (data) => (await api.post('/timetable/plans/', data)).data,
  updatePlan: async (id, data) => (await api.put(`/timetable/plans/${id}/`, data)).data,
  deletePlan: async (id) => (await api.delete(`/timetable/plans/${id}/`)).data,
  publishPlan: async (id, notes) => (await api.post(`/timetable/plans/${id}/publish/`, { notes })).data,
  generateSlots: async (id) => (await api.post(`/timetable/plans/${id}/generate-slots/`)).data,
  autoSchedule: async (id) => (await api.post(`/timetable/plans/${id}/auto-schedule/`)).data,
  clearSessions: async (id) => (await api.post(`/timetable/plans/${id}/clear-sessions/`)).data,
  getPlanGrid: async (id, params) => (await api.get(`/timetable/plans/${id}/grid/`, { params })).data,
  /** Auto-generates a plan name from selected IDs */
  generatePlanName: async (params) => (await api.get('/timetable/plans/generate-name/', { params })).data,
  /** Flat list of class sessions for calendar, supports date/campus/dept/faculty/semester filters */
  getCalendarSessions: async (params) => (await api.get('/timetable/plans/calendar-sessions/', { params })).data,

  // Slots & Sessions (The Grid Builder APIs)
  suggestRooms: async (slotId, courseType, facultyId) => (await api.get(`/timetable/slots/${slotId}/suggest-rooms/`, { params: { course_type: courseType, faculty_id: facultyId } })).data,
  createClassSession: async (data) => (await api.post('/timetable/class-sessions/', data)).data,
  updateClassSession: async (id, data) => (await api.patch(`/timetable/class-sessions/${id}/`, data)).data,
  deleteClassSession: async (id) => (await api.delete(`/timetable/class-sessions/${id}/`)).data,
  
  createFacultyAssignment: async (data) => (await api.post('/timetable/faculty-assignments/', data)).data,
  deleteFacultyAssignment: async (id) => (await api.delete(`/timetable/faculty-assignments/${id}/`)).data,
  
  createRoomAssignment: async (data) => (await api.post('/timetable/room-assignments/', data)).data,
  deleteRoomAssignment: async (id) => (await api.delete(`/timetable/room-assignments/${id}/`)).data,

  // Logs & Requests
  getLogs: async (params) => (await api.get('/timetable/publish-logs/', { params })).data,
  getChangeRequests: async (params) => (await api.get('/timetable/change-requests/', { params })).data,

  // Leave Requests
  getLeaveRequests: async (params) => unpack(await api.get('/timetable/leave-requests/', { params })),
  createLeaveRequest: async (data) => (await api.post('/timetable/leave-requests/', data)).data,
  approveLeave: async (id, notes) => (await api.post(`/timetable/leave-requests/${id}/approve/`, { notes })).data,
  rejectLeave: async (id, notes) => (await api.post(`/timetable/leave-requests/${id}/reject/`, { notes })).data,
  deleteLeaveRequest: async (id) => (await api.delete(`/timetable/leave-requests/${id}/`)).data,

  // Substitution Requests
  getSubstitutionRequests: async (params) => unpack(await api.get('/timetable/substitution-requests/', { params })),
  createSubstitution: async (data) => (await api.post('/timetable/substitution-requests/', data)).data,
  approveSubstitution: async (id) => (await api.post(`/timetable/substitution-requests/${id}/approve/`)).data,
  rejectSubstitution: async (id) => (await api.post(`/timetable/substitution-requests/${id}/reject/`)).data,
  hodApproveSubstitution: async (id, notes) => (await api.post(`/timetable/substitution-requests/${id}/hod-approve/`, { notes })).data,
  hodRejectSubstitution: async (id, notes) => (await api.post(`/timetable/substitution-requests/${id}/hod-reject/`, { notes })).data,

  // Faculty timetable view
  getClassSessions: async (params) => unpack(await api.get('/timetable/class-sessions/', { params })),
  getWorkloadSummary: async (params) => unpack(await api.get('/timetable/faculty-assignments/', { params })),

  // Faculty Preferences (faculty-owned)
  getMyPreference: async () => (await api.get('/academics/faculty-preferences/my-preference/')).data,
  upsertMyPreference: async (data) => (await api.post('/academics/faculty-preferences/my-preference/', data)).data,
  getMyPreferenceCourses: async () => (await api.get('/academics/faculty-preferences/my-courses/')).data,
};

