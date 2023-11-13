import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { sessionState } from "@atoms/supabaseAtoms";

export default function RestrictedRoute(props: { page: React.ReactNode }) {
  const navigate = useNavigate();
  const session = useRecoilValue(sessionState);

  useEffect(() => {
    const redirect = window.location.pathname.substring(1);
    setTimeout(() => {
      if (!session) {
        navigate(`/login?redirect=${redirect}`);
      }
    });
  }, [session]);

  if (session) {
    return <>{props.page}</>;
  } else {
    return <></>;
  }
}
