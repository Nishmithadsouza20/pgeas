const BASE = '/api';

function getToken() {
  return localStorage.getItem('pgease_token');
}

function headers(extra = {}) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...extra };
}

async function req(method, path, body) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get:    (path)       => req('GET',    path),
  post:   (path, body) => req('POST',   path, body),
  put:    (path, body) => req('PUT',    path, body),
  delete: (path)       => req('DELETE', path),

  // Auth
  login:          (email, password)          => req('POST', '/auth/login',          { email, password }),
  verifyOtp:      (email, otp)               => req('POST', '/auth/verify-otp',      { email, otp }),
  forgotPassword: (email)                    => req('POST', '/auth/forgot-password', { email }),
  resetPassword:  (email, otp, new_password) => req('POST', '/auth/reset-password', { email, otp, new_password }),
  getUsers:       ()                         => req('GET',  '/auth/users'),

  // Rooms
  getRooms:     ()      => req('GET',    '/rooms/'),
  getRoomStats: ()      => req('GET',    '/rooms/stats'),
  createRoom:   (d)     => req('POST',   '/rooms/', d),
  updateRoom:   (id, d) => req('PUT',    `/rooms/${id}`, d),
  deleteRoom:   (id)    => req('DELETE', `/rooms/${id}`),

  // Residents
  getResidents:   (q='') => req('GET',    `/residents/?${q}`),
  getUnassigned:  ()     => req('GET',    '/residents/unassigned'),
  getMyProfile:   ()     => req('GET',    '/residents/my'),
  createResident: (d)    => req('POST',   '/residents/', d),
  updateResident: (id,d) => req('PUT',    `/residents/${id}`, d),
  deleteResident: (id)   => req('DELETE', `/residents/${id}`),

  // Payments
  getPayments:    (q='') => req('GET',  `/payments/?${q}`),
  createPayment:  (d)    => req('POST', '/payments/', d),
  updatePayment:  (id,d) => req('PUT',  `/payments/${id}`, d),
  paymentSummary: (m,y)  => req('GET',  `/payments/summary?month=${m}&year=${y}`),
  remindPayment:  (id)   => req('POST', `/payments/remind/${id}`),

  // Complaints
  getComplaints:  (q='') => req('GET',  `/complaints/?${q}`),
  createComplaint:(d)    => req('POST', '/complaints/', d),
  updateComplaint:(id,d) => req('PUT',  `/complaints/${id}`, d),
  complaintStats: ()     => req('GET',  '/complaints/stats'),

  // Notices
  getNotices:    ()     => req('GET',    '/notices/'),
  createNotice:  (d)    => req('POST',   '/notices/', d),
  updateNotice:  (id,d) => req('PUT',    `/notices/${id}`, d),
  deleteNotice:  (id)   => req('DELETE', `/notices/${id}`),
  markRead:      (id)   => req('POST',   `/notices/${id}/read`),

  // Mess
  getMenu:       (week=1) => req('GET',    `/mess/?week=${week}`),
  getTodayMenu:  ()       => req('GET',    '/mess/today'),
  createMenuItem:(d)      => req('POST',   '/mess/', d),
  updateMenuItem:(id,d)   => req('PUT',    `/mess/${id}`, d),
  deleteMenuItem:(id)     => req('DELETE', `/mess/${id}`),

  // Visitors
  getVisitors:      ()     => req('GET',  '/visitors/'),
  getActiveVisitors:()     => req('GET',  '/visitors/active'),
  logVisitor:       (d)    => req('POST', '/visitors/', d),
  checkoutVisitor:  (id,d) => req('PUT',  `/visitors/${id}`, d),

  // Staff
  getStaff:    ()     => req('GET',    '/staff/'),
  getStaffStats:()    => req('GET',    '/staff/stats'),
  createStaff: (d)    => req('POST',   '/staff/', d),
  updateStaff: (id,d) => req('PUT',    `/staff/${id}`, d),
  deleteStaff: (id)   => req('DELETE', `/staff/${id}`),

  // Expenses
  getExpenses:       (q='') => req('GET',    `/expenses/?${q}`),
  getExpenseSummary: (m,y)  => req('GET',    `/expenses/summary?month=${m}&year=${y}`),
  createExpense:     (d)    => req('POST',   '/expenses/', d),
  updateExpense:     (id,d) => req('PUT',    `/expenses/${id}`, d),
  deleteExpense:     (id)   => req('DELETE', `/expenses/${id}`),

  // Food Inventory
  getFoodInventory:  ()     => req('GET',    '/food/'),
  getFoodStats:      ()     => req('GET',    '/food/stats'),
  getLowStock:       ()     => req('GET',    '/food/low-stock'),
  createFoodItem:    (d)    => req('POST',   '/food/', d),
  updateFoodItem:    (id,d) => req('PUT',    `/food/${id}`, d),
  deleteFoodItem:    (id)   => req('DELETE', `/food/${id}`),

  // Payment Gateway
  gatewayPay:     (d) => req('POST', '/payments/gateway/pay', d),
  gatewayHistory: ()  => req('GET',  '/payments/gateway/history'),

  // Company / Client Management
  getCompanies:       ()     => req('GET',    '/companies/'),
  getCompanyStats:    ()     => req('GET',    '/companies/stats'),
  createCompany:      (d)    => req('POST',   '/companies/', d),
  updateCompany:      (id,d) => req('PUT',    `/companies/${id}`, d),
  deleteCompany:      (id)   => req('DELETE', `/companies/${id}`),
  provisionClient:    (d)    => req('POST',   '/companies/provision', d),
  resetOwnerPassword: (id,d) => req('POST',   `/companies/${id}/reset-password`, d),
  getMySettings:      ()     => req('GET',    '/companies/my-settings'),
  updateMySettings:   (d)    => req('PUT',    '/companies/my-settings', d),
  getClientBilling:   (id)   => req('GET',    `/companies/${id}/billing`),
  createBillingEntry: (id,d) => req('POST',   `/companies/${id}/billing`, d),
  updateBillingEntry: (id,pid,d) => req('PUT', `/companies/${id}/billing/${pid}`, d),
  sendClientEmail:    (id,d) => req('POST',   `/companies/${id}/send-email`, d),
  getClientEmails:    (id)   => req('GET',    `/companies/${id}/emails`),
  getEmailLogs:       ()     => req('GET',    '/companies/email-logs'),

  // Analytics
  dashboardStats:     () => req('GET', '/analytics/dashboard'),
  occupancyTrend:     () => req('GET', '/analytics/occupancy'),
  revenueTrend:       () => req('GET', '/analytics/revenue'),
  complaintsBreakdown:() => req('GET', '/analytics/complaints-breakdown'),
  residentRatio:      () => req('GET', '/analytics/resident-ratio'),
  paymentRate:        () => req('GET', '/analytics/payment-rate'),
  roomStatusChart:    () => req('GET', '/analytics/room-status'),

  // Attendance
  getAttendance:  (q='') => req('GET',  `/attendance/?${q}`),
  markAttendance: (d)    => req('POST', '/attendance/', d),
  attendanceSummary:(m,y)=> req('GET',  `/attendance/summary?month=${m}&year=${y}`),

  // Payroll
  getPayroll:       (m,y) => req('GET',  `/payroll/?month=${m}&year=${y}`),
  generatePayroll:  (d)   => req('POST', '/payroll/generate', d),
  updatePayrollItem:(id,d)=> req('PUT',  `/payroll/${id}`, d),

  // Maintenance
  getMaintenance:    (q='') => req('GET',    `/maintenance/?${q}`),
  getMaintenanceStats:()    => req('GET',    '/maintenance/stats'),
  createMaintenance: (d)    => req('POST',   '/maintenance/', d),
  updateMaintenance: (id,d) => req('PUT',    `/maintenance/${id}`, d),
  deleteMaintenance: (id)   => req('DELETE', `/maintenance/${id}`),

  // Gate Pass
  getGatePasses:  (q='') => req('GET',    `/gatepass/?${q}`),
  createGatePass: (d)    => req('POST',   '/gatepass/', d),
  updateGatePass: (id,d) => req('PUT',    `/gatepass/${id}`, d),
  deleteGatePass: (id)   => req('DELETE', `/gatepass/${id}`),

  // Invoices
  getInvoices: (m,y) => req('GET', `/invoices/?month=${m}&year=${y}`),

  // Utilities
  getUtilities:    (m,y) => req('GET',    `/utilities/?month=${m}&year=${y}`),
  getUtilityRooms: (m,y) => req('GET',    `/utilities/rooms?month=${m}&year=${y}`),
  upsertUtility:   (d)   => req('POST',   '/utilities/', d),
  updateUtility:   (id,d)=> req('PUT',    `/utilities/${id}`, d),
  deleteUtility:   (id)  => req('DELETE', `/utilities/${id}`),

  // Deposits
  getDeposits:    ()     => req('GET',    '/deposits/'),
  createDeposit:  (d)    => req('POST',   '/deposits/', d),
  updateDeposit:  (id,d) => req('PUT',    `/deposits/${id}`, d),
  deleteDeposit:  (id)   => req('DELETE', `/deposits/${id}`),

  // Reports
  getPlReport:       (m,y) => req('GET', `/reports/pl?month=${m}&year=${y}`),
  getRentRoll:       (m,y) => req('GET', `/reports/rent-roll?month=${m}&year=${y}`),
  getDefaulters:     ()    => req('GET', '/reports/defaulters'),
  getOccupancyReport:()    => req('GET', '/reports/occupancy'),

  // Enquiries
  getEnquiries:    (q='') => req('GET',    `/enquiries/?${q}`),
  createEnquiry:   (d)    => req('POST',   '/enquiries/', d),
  updateEnquiry:   (id,d) => req('PUT',    `/enquiries/${id}`, d),
  deleteEnquiry:   (id)   => req('DELETE', `/enquiries/${id}`),

  // Notifications
  getNotifications:  ()   => req('GET', '/notifications/'),
  getUnreadCount:    ()   => req('GET', '/notifications/count'),
  markNotifRead:     (id) => req('PUT', `/notifications/${id}/read`),
  markAllNotifsRead: ()   => req('PUT', '/notifications/read-all'),

  // Meal Attendance
  getMealAttendance:  (date)        => req('GET', `/meals/?date=${date}`),
  saveMealAttendance: (records)     => req('POST', '/meals/', records),
  getMealMonthly:     (month, year) => req('GET', `/meals/monthly?month=${month}&year=${year}`),
  getMealSettings:    ()            => req('GET', '/meals/settings'),
  updateMealSettings: (d)           => req('PUT', '/meals/settings', d),
};

export async function exportCSV() {
  const res = await fetch('/api/residents/export', { headers: { Authorization: `Bearer ${getToken()}` } });
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'residents.csv'; a.click();
  URL.revokeObjectURL(url);
}
