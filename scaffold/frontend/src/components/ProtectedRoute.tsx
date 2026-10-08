import { Navigate, Outlet } from 'react-router-dom';

export function ProtectedRoute() {
  return localStorage.getItem('pm.token') ? <Outlet /> : <Navigate to="/login" replace />;
}
