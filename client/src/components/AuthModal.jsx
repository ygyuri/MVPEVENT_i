import { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  login,
  register,
  clearError,
  setAuthToken,
  setUser,
  getCurrentUser,
} from "../store/slices/authSlice";
import { useTheme } from "../contexts/ThemeContext";

const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "", // Auto-generated from name
    name: "",
    walletAddress: "", // Hidden from UI
    role: "customer",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, user } = useSelector(
    (state) => state.auth
  );
  const { isDarkMode } = useTheme();
  const resolveApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL.replace(/\/$/, "");
    }

    if (typeof window !== "undefined") {
      if (import.meta.env.DEV) {
        return `${window.location.protocol}//${window.location.hostname}:5000`;
      }

      return window.location.origin.replace(/\/$/, "");
    }

    return "http://localhost:5000";
  };

  const apiBaseUrl = resolveApiBaseUrl();
  const defaultFrontendOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const frontendOrigin =
    (import.meta.env.VITE_FRONTEND_URL &&
      import.meta.env.VITE_FRONTEND_URL.replace(/\/$/, "")) ||
    defaultFrontendOrigin;

  const oauthWindowRef = useRef(null);
  const oauthListenerRef = useRef(null);
  const oauthTimerRef = useRef(null);
  const oauthCompletedRef = useRef(false);

  const cleanupOAuth = useCallback(({ closeWindow = true } = {}) => {
    if (oauthListenerRef.current && typeof window !== "undefined") {
      window.removeEventListener("message", oauthListenerRef.current);
      oauthListenerRef.current = null;
    }

    if (oauthTimerRef.current) {
      clearInterval(oauthTimerRef.current);
      oauthTimerRef.current = null;
    }

    if (
      closeWindow &&
      oauthWindowRef.current &&
      !oauthWindowRef.current.closed
    ) {
      oauthWindowRef.current.close();
    }
    oauthWindowRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupOAuth();
    };
  }, [cleanupOAuth]);

  useEffect(() => {
    if (!isOpen) {
      cleanupOAuth();
    }
  }, [isOpen, cleanupOAuth]);

  // Close modal after authentication without updating during render
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      cleanupOAuth();
      onClose();
    }
  }, [isAuthenticated, isOpen, onClose, cleanupOAuth]);

  if (!isOpen) return null;
  const resolveRedirectPath = (targetPath, userRole) => {
    if (typeof targetPath === "string" && targetPath.startsWith("/")) {
      return targetPath;
    }

    if (userRole === "organizer") {
      return "/organizer/dashboard";
    }

    return "/";
  };

  const handleGoogleLogin = () => {
    if (typeof window === "undefined") return;

    cleanupOAuth();
    oauthCompletedRef.current = false;

    setLocalError("");
    setSuccessMessage("");
    dispatch(clearError());

    const redirectParam = encodeURIComponent(
      `${window.location.pathname}${window.location.search}`
    );
    const authUrl = `${apiBaseUrl}/api/auth/google?redirect=${redirectParam}`;

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      "google-login",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      setLocalError(
        "Please enable pop-ups to sign in with Google. You can try again after allowing pop-ups for this site."
      );
      return;
    }

    oauthWindowRef.current = popup;

    const listener = async (event) => {
      if (event.origin !== frontendOrigin) return;
      const { type, provider, payload, message } = event.data || {};
      if (provider !== "google") return;

      oauthCompletedRef.current = true;
      cleanupOAuth({ closeWindow: true });

      if (type === "oauth-error") {
        setLocalError(
          message || "Google sign-in failed. Please try again later."
        );
        return;
      }

      if (type !== "oauth-success" || !payload) {
        setLocalError("Unexpected response from Google sign-in.");
        return;
      }

      const { tokens, user: oauthUser, redirect } = payload;

      if (!tokens?.accessToken || !tokens?.refreshToken) {
        setLocalError("Failed to receive authentication tokens from Google.");
        return;
      }

      console.log("🔐 [GOOGLE OAUTH] Received payload:", {
        hasTokens: !!tokens?.accessToken,
        hasUser: !!oauthUser,
        userData: oauthUser,
      });

      // Store tokens FIRST
      localStorage.setItem("authToken", tokens.accessToken);
      localStorage.setItem("refreshToken", tokens.refreshToken);
      
      // Set auth token in Redux
      dispatch(setAuthToken(tokens.accessToken));

      // Set user immediately from OAuth payload
      // This ensures user is logged in even if getCurrentUser fails or is slow
      if (oauthUser) {
        console.log("👤 [GOOGLE OAUTH] Setting user from OAuth payload:", oauthUser);
        dispatch(setUser(oauthUser));
        
        // Log that we're setting the user
        console.log("✅ [GOOGLE OAUTH] Dispatched setUser action");
      } else {
        console.warn("⚠️ [GOOGLE OAUTH] No user data in OAuth payload!");
      }

      setSuccessMessage("Signed in with Google. Finishing up...");

      try {
        // Fetch fresh user data from backend
        const fetchedUser = await dispatch(getCurrentUser()).unwrap();
        console.log("✅ [GOOGLE OAUTH] Fetched user from backend:", fetchedUser);
        
        const destination = resolveRedirectPath(
          redirect,
          fetchedUser?.role || oauthUser?.role
        );
        
        // Small delay to ensure state is updated before navigation
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        onClose();
        navigate(destination);
      } catch (fetchError) {
        console.error("❌ [GOOGLE OAUTH] Failed to fetch user after Google login:", fetchError);
        
        // Even if getCurrentUser fails, we have oauthUser set, so proceed
        if (oauthUser) {
          console.log("🔄 [GOOGLE OAUTH] Using OAuth user data as fallback");
          const destination = resolveRedirectPath(redirect, oauthUser?.role);
          
          // Small delay to ensure state is updated before navigation
          await new Promise((resolve) => setTimeout(resolve, 100));
          
        onClose();
        navigate(destination);
        } else {
          setLocalError("Failed to complete Google sign-in. Please try again.");
        }
      }
    };

    oauthListenerRef.current = listener;
    window.addEventListener("message", listener);

    oauthTimerRef.current = window.setInterval(() => {
      if (!oauthWindowRef.current || oauthWindowRef.current.closed) {
        clearInterval(oauthTimerRef.current);
        oauthTimerRef.current = null;
        if (!oauthCompletedRef.current) {
          cleanupOAuth({ closeWindow: false });
          setLocalError(
            "Google sign-in was closed before completion. Please try again."
          );
        }
      }
    }, 500);
  };

  // Auto-generate username from name
  const generateUsername = (name) => {
    if (!name) return "";
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const randomSuffix = Math.floor(Math.random() * 1000);
    return `${base}${randomSuffix}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setSuccessMessage("");

    try {
      if (isLogin) {
        const result = await dispatch(
          login({ email: formData.email, password: formData.password })
        ).unwrap();

        setSuccessMessage("Signed in successfully.");

        // Close modal and navigate based on user role
        setTimeout(() => {
          onClose();

          // Navigate based on user role
          if (result.user.role === "organizer") {
            navigate("/organizer/dashboard");
          } else {
            navigate("/");
          }
        }, 1500);
      } else {
        // Simple validation (real-time validation already handled)
        if (!formData.name) {
          setLocalError("Please enter your name.");
          return;
        }
        if (!formData.email) {
          setLocalError("Please enter your email address.");
          return;
        }
        if (formData.password.length < 8) {
          setLocalError("Password must be at least 8 characters.");
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setLocalError("Passwords do not match.");
          return;
        }

        // Auto-generate username
        const generatedUsername = generateUsername(formData.name);

        const result = await dispatch(
          register({
            email: formData.email,
            password: formData.password,
            username: generatedUsername,
            name: formData.name,
            walletAddress: formData.walletAddress || undefined,
            role: formData.role,
          })
        ).unwrap();

        setSuccessMessage(`Account created successfully. Redirecting...`);
        setIsNewUser(true);

        setTimeout(() => {
          onClose();

          // Navigate based on user role
          if (result.user.role === "organizer") {
            navigate("/organizer/dashboard");
          } else {
            navigate("/");
          }
        }, 3000);
      }
    } catch (err) {
      // handled by slice
    }
  };

  const handleInputChange = (e) => {
    dispatch(clearError());
    setLocalError("");
    setSuccessMessage("");
    const newFormData = { ...formData, [e.target.name]: e.target.value };

    // Auto-generate username when name changes
    if (e.target.name === "name") {
      newFormData.username = generateUsername(e.target.value);
    }

    setFormData(newFormData);
  };

  const resetForm = () => {
    setLocalError("");
    setSuccessMessage("");
    setIsNewUser(false);
    setPasswordTouched(false);
    setConfirmTouched(false);
    dispatch(clearError());
    cleanupOAuth();
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
      name: "",
      walletAddress: "",
      role: "customer",
    });
  };

  // Real-time password validation
  const passwordsMatch =
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword;
  const passwordsDontMatch =
    confirmTouched &&
    formData.confirmPassword &&
    formData.password !== formData.confirmPassword;
  const passwordTooShort =
    passwordTouched && formData.password && formData.password.length < 8;

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop with better blur */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={() => {
          resetForm();
          onClose();
        }}
      />

      {/* Modal Content */}
      <div
        className={`${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        } border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden theme-transition max-h-[90vh] overflow-y-auto relative z-[10001]`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] p-6 sm:p-8 text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
          </div>

          <div className="relative flex justify-between items-center">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
                {isLogin ? "Welcome Back" : "Join Event-i"}
              </h2>
              <p className="text-white/90 text-sm sm:text-lg">
                {isLogin ? "Sign in to your account" : "Create your account"}
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all duration-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 sm:p-8">
          {/* Success Message */}
          {successMessage && (
            <div
              className={`mb-6 p-4 ${
                isDarkMode
                  ? "bg-green-900/20 border-green-800 text-green-200"
                  : "bg-green-50 border-green-200 text-green-800"
              } border rounded-xl`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className={`h-5 w-5 ${
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {(localError || error) && (
            <div
              className={`mb-6 p-4 ${
                isDarkMode
                  ? "bg-red-900/20 border-red-800 text-red-200"
                  : "bg-red-50 border-red-200 text-red-800"
              } border rounded-xl`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className={`h-5 w-5 ${
                      isDarkMode ? "text-red-400" : "text-red-600"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{localError || error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border font-semibold transition-colors duration-200 ${
                isDarkMode
                  ? "bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
              disabled={loading}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 533.5 544.3"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M533.5 278.4c0-17.4-1.4-35.7-4.6-52.8H272v99.8h146.9c-6 33.6-24.5 62.2-52 81.3v67.4h83.9c49 45 77.2 111.2 77.2 182.4 0 19.9-1.6 39.2-4.6 57.5h.1V278.4Z"
                    fill="#4285f4"
                  />
                  <path
                    d="M272 544.3c72.5 0 133.5-24 178.1-65.2l-83.9-67.4c-23.3 16-53.3 25-94.2 25-72 0-133.6-48.2-155.6-112.9H31v70.6c45 88.4 138.4 149.9 241 149.9Z"
                    fill="#34a853"
                  />
                  <path
                    d="M116.4 323.4c-5.1-15-8-31.2-8-47.4 0-16.2 2.9-32.4 8-47.4V158H31c-29.5 58.9-29.5 128.4 0 187.3l85.4-21.9Z"
                    fill="#fbbc04"
                  />
                  <path
                    d="M272 106.6c39.5-.5 76.6 13.8 104.9 39.4l78.1-78c-48.1-44.9-111.4-68-183-68C169.4 0 76 61.6 31 149.9l85.4 70.6C138.4 154.1 200 106.6 272 106.6Z"
                    fill="#ea4335"
                  />
                </svg>
              </span>
              Continue with Google
            </button>
            <div className="flex items-center gap-3">
              <span
                className={`flex-1 h-px ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-200"
                }`}
              />
              <span
                className={`text-xs uppercase tracking-wide ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                or
              </span>
              <span
                className={`flex-1 h-px ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-200"
                }`}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {!isLogin && (
              <div>
                <label
                  className={`block text-sm font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  } mb-2`}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-3 rounded-xl ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } border focus:outline-none focus:ring-2 focus:ring-[#4f0f69]/20 focus:border-[#4f0f69] transition-all duration-200`}
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label
                className={`block text-sm font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                } mb-2`}
              >
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className={`w-full px-4 py-3 rounded-xl ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } border focus:outline-none focus:ring-2 focus:ring-[#4f0f69]/20 focus:border-[#4f0f69] transition-all duration-200`}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label
                className={`block text-sm font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                } mb-2`}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={() => setPasswordTouched(true)}
                  required
                  className={`w-full px-4 py-3 pr-12 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 ${
                    passwordTooShort && !isLogin
                      ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                      : isDarkMode
                      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:ring-[#4f0f69]/20 focus:border-[#4f0f69]"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-[#4f0f69]/20 focus:border-[#4f0f69]"
                  }`}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    isDarkMode
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                  } transition-colors duration-200`}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {passwordTooShort && !isLogin && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Password must be at least 8 characters
                </p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label
                  className={`block text-sm font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  } mb-2`}
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    onBlur={() => setConfirmTouched(true)}
                    required
                    className={`w-full px-4 py-3 pr-12 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 ${
                      passwordsMatch
                        ? "border-green-500 focus:ring-green-500/20 focus:border-green-500"
                        : passwordsDontMatch
                        ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                        : isDarkMode
                        ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:ring-[#4f0f69]/20 focus:border-[#4f0f69]"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-[#4f0f69]/20 focus:border-[#4f0f69]"
                    }`}
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    } transition-colors duration-200`}
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                  {passwordsMatch && (
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 text-green-500">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                {passwordsDontMatch && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Passwords do not match
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Passwords match
                  </p>
                )}
              </div>
            )}

            {!isLogin && (
              /* Role Selection */
              <div>
                <label
                  className={`block text-sm font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  } mb-3`}
                >
                  I'm signing up as...
                </label>
                <div className="space-y-3">
                  {/* Customer Option */}
                  <label
                    className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:bg-opacity-50 ${
                      formData.role === "customer"
                        ? `${
                            isDarkMode
                              ? "bg-[#4f0f69]/30 border-[#4f0f69]"
                              : "bg-[#4f0f69]/10 border-[#4f0f69]"
                          }`
                        : `${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600 hover:bg-gray-700"
                              : "bg-white border-gray-300 hover:bg-gray-50"
                          }`
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="customer"
                      checked={formData.role === "customer"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                        formData.role === "customer"
                          ? "border-[#4f0f69] bg-[#4f0f69]"
                          : `${
                              isDarkMode ? "border-gray-500" : "border-gray-400"
                            }`
                      }`}
                    >
                      {formData.role === "customer" && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex items-center flex-1">
                      <svg
                        className={`w-6 h-6 mr-3 ${
                          isDarkMode ? "text-[#8A4FFF]" : "text-[#4f0f69]"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                        />
                      </svg>
                      <div>
                        <div
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Customer
                        </div>
                        <div
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Attending events and buying tickets
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Organizer Option */}
                  <label
                    className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:bg-opacity-50 ${
                      formData.role === "organizer"
                        ? `${
                            isDarkMode
                              ? "bg-[#4f0f69]/30 border-[#4f0f69]"
                              : "bg-[#4f0f69]/10 border-[#4f0f69]"
                          }`
                        : `${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600 hover:bg-gray-700"
                              : "bg-white border-gray-300 hover:bg-gray-50"
                          }`
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="organizer"
                      checked={formData.role === "organizer"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                        formData.role === "organizer"
                          ? "border-[#4f0f69] bg-[#4f0f69]"
                          : `${
                              isDarkMode ? "border-gray-500" : "border-gray-400"
                            }`
                      }`}
                    >
                      {formData.role === "organizer" && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex items-center flex-1">
                      <svg
                        className={`w-6 h-6 mr-3 ${
                          isDarkMode ? "text-[#8A4FFF]" : "text-[#4f0f69]"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <div>
                        <div
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Organizer
                        </div>
                        <div
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Creating and managing events
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                (!isLogin && (passwordTooShort || passwordsDontMatch))
              }
              className="w-full py-3 sm:py-4 px-6 rounded-xl font-semibold text-white text-base sm:text-lg bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] hover:from-[#6b1a8a] hover:to-[#4f0f69] focus:outline-none focus:ring-2 focus:ring-[#4f0f69]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  {isLogin ? "Signing In..." : "Creating Account..."}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {isLogin ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    )}
                  </svg>
                  {isLogin ? "Sign In" : "Create Account"}
                </div>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 sm:mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div
                  className={`w-full border-t ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                ></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span
                  className={`px-4 ${
                    isDarkMode
                      ? "bg-gray-800 text-gray-400"
                      : "bg-white text-gray-600"
                  }`}
                >
                  {isLogin
                    ? "Don't have an account?"
                    : "Already have an account?"}
                </span>
              </div>
            </div>
            <button
              onClick={toggleMode}
              className={`mt-3 sm:mt-4 ${
                isDarkMode
                  ? "text-[#8A4FFF] hover:text-[#9D6CFF]"
                  : "text-[#4f0f69] hover:text-[#6b1a8a]"
              } font-semibold text-base sm:text-lg transition-colors duration-200 flex items-center justify-center mx-auto`}
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
