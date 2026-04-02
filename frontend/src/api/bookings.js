import axiosInstance from './axios';

const unpack = (r) => r.data.results ?? r.data;

export const bookingsApi = {
  // Policies
  getPolicies: async (params) => unpack(await axiosInstance.get('/bookings/policies/', { params })),
  createPolicy: async (data) => (await axiosInstance.post('/bookings/policies/', data)).data,
  updatePolicy: async (id, data) => (await axiosInstance.patch(`/bookings/policies/${id}/`, data)).data,
  deletePolicy: async (id) => (await axiosInstance.delete(`/bookings/policies/${id}/`)).data,

  // Booking Requests
  getBookings: async (params) => unpack(await axiosInstance.get('/bookings/requests/', { params })),
  getBooking: async (id) => (await axiosInstance.get(`/bookings/requests/${id}/`)).data,
  createBooking: async (data) => (await axiosInstance.post('/bookings/requests/', data)).data,
  updateBooking: async (id, data) => (await axiosInstance.patch(`/bookings/requests/${id}/`, data)).data,
  cancelBooking: async (id) => (await axiosInstance.post(`/bookings/requests/${id}/cancel/`)).data,
  activateBooking: async (id) => (await axiosInstance.post(`/bookings/requests/${id}/activate/`)).data,

  // Views
  getMyBookings: async () => unpack(await axiosInstance.get('/bookings/requests/my-bookings/')),
  getApprovalInbox: async () => unpack(await axiosInstance.get('/bookings/requests/approval-inbox/')),

  // Approvals
  submitApproval: async (data) => (await axiosInstance.post('/bookings/approvals/', data)).data,

  // Conflict Logs
  getConflicts: async () => unpack(await axiosInstance.get('/bookings/conflicts/')),
};
