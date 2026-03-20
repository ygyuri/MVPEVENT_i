import React, { createContext, useContext, useMemo } from "react";
import { useSelector } from "react-redux";

const UserContext = createContext({
  user: null,
  isAuthenticated: false,
});

export const UserProvider = ({ children }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const value = useMemo(
    () => ({
      user: user || null,
      isAuthenticated: !!isAuthenticated,
    }),
    [user, isAuthenticated]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
