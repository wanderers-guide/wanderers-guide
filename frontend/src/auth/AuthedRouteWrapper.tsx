import { sessionState } from '@atoms/supabaseAtoms';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useRecoilValue } from 'recoil';

export function AuthRouteWrapper() {
  const session = useRecoilValue(sessionState);
  const location = useLocation();

  const redirect = (location.pathname + location.search).substring(1);

  if (session) {
    return <Outlet />;
  } else {
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
}
