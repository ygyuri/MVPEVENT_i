import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../store/slices/authSlice";
import { setAuthToken } from "../store/slices/authSlice";

const OAuthCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const accessToken = url.searchParams.get("accessToken");
      const refreshToken = url.searchParams.get("refreshToken");

      if (import.meta.env.DEV) {
        console.log("[OAUTH] Callback received", {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
        });
      }

      if (accessToken) localStorage.setItem("authToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      if (accessToken) {
        dispatch(setAuthToken(accessToken));
      }

      if (!accessToken) {
        navigate("/?authError=missing_tokens", { replace: true });
        return;
      }

      try {
        const user = await dispatch(getCurrentUser()).unwrap();
        if (import.meta.env.DEV) {
          console.log("[OAUTH] getCurrentUser success", {
            role: user?.role,
            email: user?.email,
          });
        }

        if (user?.role === "admin") {
          navigate("/admin", { replace: true });
          return;
        }
        if (user?.role === "organizer") {
          navigate("/organizer/dashboard", { replace: true });
          return;
        }

        navigate("/", { replace: true });
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error("[OAUTH] getCurrentUser failed", e);
        }
        navigate("/?authError=failed_to_load_user", { replace: true });
      }
    };

    run();
  }, [dispatch, navigate]);

  return null;
};

export default OAuthCallback;
