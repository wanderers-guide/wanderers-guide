import { sessionState } from "@atoms/supabaseAtoms";
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useRecoilValue } from "recoil";

export default function RestrictedRoute(props: { page: React.ReactNode }) {
  const session = useRecoilValue(sessionState);
  const location = useLocation();

  const redirect = location.pathname.substring(1);

  if (session) {
    return <>{props.page}</>;
  } else {
    return <Navigate to={`/login?redirect=${redirect}`} />;
  }
}
