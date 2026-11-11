import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RotaProtegida({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}