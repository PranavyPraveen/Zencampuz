import axiosInstance from './axios';
const unpack = (r) => r.data.results ?? r.data;

export const academicsApi = {
  // Departments
  getDepartments: async (p) => unpack(await axiosInstance.get('/academics/departments/', { params: p })),
  createDepartment: async (d) => (await axiosInstance.post('/academics/departments/', d)).data,
  updateDepartment: async (id, d) => (await axiosInstance.patch(`/academics/departments/${id}/`, d)).data,
  deleteDepartment: async (id) => (await axiosInstance.delete(`/academics/departments/${id}/`)).data,

  // Subject Domains
  getSubjectDomains: async (p) => unpack(await axiosInstance.get('/academics/subject-domains/', { params: p })),
  createSubjectDomain: async (d) => (await axiosInstance.post('/academics/subject-domains/', d)).data,
  updateSubjectDomain: async (id, d) => (await axiosInstance.patch(`/academics/subject-domains/${id}/`, d)).data,
  deleteSubjectDomain: async (id) => (await axiosInstance.delete(`/academics/subject-domains/${id}/`)).data,

  // Programs
  getPrograms: async (p) => unpack(await axiosInstance.get('/academics/programs/', { params: p })),
  createProgram: async (d) => (await axiosInstance.post('/academics/programs/', d)).data,
  updateProgram: async (id, d) => (await axiosInstance.patch(`/academics/programs/${id}/`, d)).data,
  deleteProgram: async (id) => (await axiosInstance.delete(`/academics/programs/${id}/`)).data,
  bulkDeletePrograms: async (ids) => (await axiosInstance.post('/academics/programs/bulk-delete/', { ids })).data,
  uploadProgramSyllabus: async (id, fd) => (await axiosInstance.post(`/academics/programs/${id}/upload-syllabus/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data,
  syncProgramSyllabusSubjects: async (id) => (await axiosInstance.post(`/academics/programs/${id}/sync-syllabus-subjects/`)).data,
  deleteProgramSyllabus: async (id, payload = {}) => (await axiosInstance.post(`/academics/programs/${id}/delete-syllabus/`, payload)).data,
  downloadProgramSyllabusTemplate: async (id) => (await axiosInstance.get(`/academics/programs/${id}/download-syllabus-template/`, { responseType: 'blob' })).data,

  // Semesters
  getSemesters: async (p) => unpack(await axiosInstance.get('/academics/semesters/', { params: p })),
  createSemester: async (d) => (await axiosInstance.post('/academics/semesters/', d)).data,
  updateSemester: async (id, d) => (await axiosInstance.patch(`/academics/semesters/${id}/`, d)).data,
  deleteSemester: async (id) => (await axiosInstance.delete(`/academics/semesters/${id}/`)).data,
  setCurrentSemester: async (id) => (await axiosInstance.post(`/academics/semesters/${id}/set-current/`)).data,

  // Courses
  getCourses: async (p) => unpack(await axiosInstance.get('/academics/courses/', { params: p })),
  createCourse: async (d) => (await axiosInstance.post('/academics/courses/', d)).data,
  updateCourse: async (id, d) => (await axiosInstance.patch(`/academics/courses/${id}/`, d)).data,
  deleteCourse: async (id) => (await axiosInstance.delete(`/academics/courses/${id}/`)).data,
  bulkDeleteCourses: async (ids) => (await axiosInstance.post('/academics/courses/bulk-delete/', { ids })).data,
  bulkUploadCourses: async (fd) => (await axiosInstance.post('/academics/courses/bulk-upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data,

  // Batches
  getBatches: async (p) => unpack(await axiosInstance.get('/academics/batches/', { params: p })),
  createBatch: async (d) => (await axiosInstance.post('/academics/batches/', d)).data,
  updateBatch: async (id, d) => (await axiosInstance.patch(`/academics/batches/${id}/`, d)).data,
  deleteBatch: async (id) => (await axiosInstance.delete(`/academics/batches/${id}/`)).data,

  // Sections
  getSections: async (p) => unpack(await axiosInstance.get('/academics/sections/', { params: p })),
  createSection: async (d) => (await axiosInstance.post('/academics/sections/', d)).data,
  updateSection: async (id, d) => (await axiosInstance.patch(`/academics/sections/${id}/`, d)).data,
  deleteSection: async (id) => (await axiosInstance.delete(`/academics/sections/${id}/`)).data,

  // Student Groups
  getStudentGroups: async (p) => unpack(await axiosInstance.get('/academics/student-groups/', { params: p })),
  createStudentGroup: async (d) => (await axiosInstance.post('/academics/student-groups/', d)).data,
  updateStudentGroup: async (id, d) => (await axiosInstance.patch(`/academics/student-groups/${id}/`, d)).data,
  deleteStudentGroup: async (id) => (await axiosInstance.delete(`/academics/student-groups/${id}/`)).data,

  // Faculty
  getFaculty: async (p) => unpack(await axiosInstance.get('/academics/faculty/', { params: p })),
  getFacultyDirectory: async (p) => unpack(await axiosInstance.get('/academics/faculty/', { params: p })),
  searchHODs: async (q) => unpack(await axiosInstance.get('/academics/faculty/search-hod/', { params: { q } })),
  createFaculty: async (d) => (await axiosInstance.post('/academics/faculty/', d)).data,
  updateFaculty: async (id, d) => (await axiosInstance.patch(`/academics/faculty/${id}/`, d)).data,
  deleteFaculty: async (id) => (await axiosInstance.delete(`/academics/faculty/${id}/`)).data,
  bulkUploadFaculty: async (fd) => (await axiosInstance.post('/academics/faculty/bulk-upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data,
  getMyProfessionalProfile: async () => (await axiosInstance.get('/academics/faculty/my-professional-profile/')).data,
  updateMyProfessionalProfile: async (d) => (await axiosInstance.patch('/academics/faculty/my-professional-profile/', d)).data,
  getFacultyProfessionalDetail: async (profileId) => (await axiosInstance.get(`/academics/faculty/${profileId}/professional-detail/`)).data,

  // Faculty Availability
  getFacultyAvailability: async (p) => unpack(await axiosInstance.get('/academics/faculty-availability/', { params: p })),
  createAvailability: async (d) => (await axiosInstance.post('/academics/faculty-availability/', d)).data,
  updateAvailability: async (id, d) => (await axiosInstance.patch(`/academics/faculty-availability/${id}/`, d)).data,
  deleteAvailability: async (id) => (await axiosInstance.delete(`/academics/faculty-availability/${id}/`)).data,

  // Faculty Preferences
  getFacultyPreferences: async (p) => unpack(await axiosInstance.get('/academics/faculty-preferences/', { params: p })),
  createPreference: async (d) => (await axiosInstance.post('/academics/faculty-preferences/', d)).data,
  updatePreference: async (id, d) => (await axiosInstance.patch(`/academics/faculty-preferences/${id}/`, d)).data,
  getMyPreference: async () => (await axiosInstance.get('/academics/faculty-preferences/my-preference/')).data,
  updateMyPreference: async (d) => (await axiosInstance.post('/academics/faculty-preferences/my-preference/', d)).data,
  approveFacultyPreference: async (id, d = {}) => (await axiosInstance.post(`/academics/faculty-preferences/${id}/approve/`, d)).data,
  rejectFacultyPreference: async (id, d = {}) => (await axiosInstance.post(`/academics/faculty-preferences/${id}/reject/`, d)).data,
  getMyCourses: async () => (await axiosInstance.get('/academics/faculty-preferences/my-courses/')).data,

  // Eligible Subjects
  getFacultyEligibleSubjects: async (p) => unpack(await axiosInstance.get('/academics/faculty-eligible-subjects/', { params: p })),
  addFacultyEligibleSubject: async (d) => (await axiosInstance.post('/academics/faculty-eligible-subjects/', d)).data,
  approveFacultyEligibleSubject: async (id) => (await axiosInstance.post(`/academics/faculty-eligible-subjects/${id}/approve/`)).data,
  rejectFacultyEligibleSubject: async (id) => (await axiosInstance.post(`/academics/faculty-eligible-subjects/${id}/reject/`)).data,
  regenerateFacultyEligibleSubjects: async () => (await axiosInstance.post('/academics/faculty-eligible-subjects/regenerate/')).data,

  // Final Subject Assignments
  getFacultySubjectAssignments: async (p) => unpack(await axiosInstance.get('/academics/faculty-subject-assignments/', { params: p })),
  createFacultySubjectAssignment: async (d) => (await axiosInstance.post('/academics/faculty-subject-assignments/', d)).data,
  updateFacultySubjectAssignment: async (id, d) => (await axiosInstance.patch(`/academics/faculty-subject-assignments/${id}/`, d)).data,
  deleteFacultySubjectAssignment: async (id) => (await axiosInstance.delete(`/academics/faculty-subject-assignments/${id}/`)).data,

  // Course Sections (Faculty-Course Assignments)
  getCourseSections: async (p) => unpack(await axiosInstance.get('/academics/course-sections/', { params: p })),
  createCourseSection: async (d) => (await axiosInstance.post('/academics/course-sections/', d)).data,
  updateCourseSection: async (id, d) => (await axiosInstance.patch(`/academics/course-sections/${id}/`, d)).data,
  deleteCourseSection: async (id) => (await axiosInstance.delete(`/academics/course-sections/${id}/`)).data,
};
