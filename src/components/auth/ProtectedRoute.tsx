import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AccessDenied from "./AccessDenied";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
  tenantTypes?: string[];
}

const ProtectedRoute = ({ children, roles, tenantTypes }: ProtectedRouteProps) => {
  const { user, profile, loading, getRedirectPath } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (roles && roles.length > 0 && profile) {
    if (!roles.includes(profile.role)) {
      // Redirect to their correct area instead of access denied
      return <Navigate to={getRedirectPath()} replace />;
    }
  }

  if (tenantTypes && tenantTypes.length > 0 && profile) {
    if (!tenantTypes.includes(profile.tenant_type)) {
      return <Navigate to={getRedirectPath()} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
