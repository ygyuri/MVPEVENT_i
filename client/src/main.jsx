import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "./store";
import App from "./App.jsx";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { UserProvider } from "./contexts/UserContext";

// Console log for deployment status
// console.log("🚀 Event-i Application Starting:", {
//   environment: import.meta.env.DEV ? "development" : "production",
//   mode: import.meta.env.MODE,
//   viteApiUrl: import.meta.env.VITE_API_URL,
//   currentUrl:
//     typeof window !== "undefined" ? window.location.href : "server-side",
//   hostname:
//     typeof window !== "undefined" ? window.location.hostname : "server-side",
//   timestamp: new Date().toISOString(),
// });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <HelmetProvider>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
          <UserProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <App />
            </BrowserRouter>
          </UserProvider>
        </GoogleOAuthProvider>
      </HelmetProvider>
    </Provider>
  </React.StrictMode>
);
