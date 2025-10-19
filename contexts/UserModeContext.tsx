import React, { createContext, useContext, useMemo } from 'react';

interface UserModeContextType {
  isAccountantMode: boolean;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export const UserModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAccountantMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'accountant';
  }, []);

  return (
    <UserModeContext.Provider value={{ isAccountantMode }}>
      {children}
    </UserModeContext.Provider>
  );
};

export const useUserMode = (): UserModeContextType => {
  const context = useContext(UserModeContext);
  if (context === undefined) {
    throw new Error('useUserMode must be used within a UserModeProvider');
  }
  return context;
};
