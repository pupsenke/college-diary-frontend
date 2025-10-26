import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Student {
  id: number;
  name: string;
  patronymic: string;
  lastName: string;
  login: string;
  numberGroup: number;
  idGroup: number;
  email?: string;
  telephone?: string;
  birthDate?: string;
  address?: string;
  userType: 'student';
}

export interface Staff {
  id: number;
  name: string;
  patronymic: string;
  lastName: string;
  login: string;
  position: string;
  staffPosition?: any[];
  userType: 'teacher' | 'metodist';
  email?: string;
  telephone?: string;
  birthDate?: string;
  address?: string;
}

export type User = Student | Staff;

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isStudent: boolean;
  isTeacher: boolean;
  isMetodist: boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const setUserWithStorage = (user: User | null) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const isStudent = user?.userType === 'student';
  const isTeacher = user?.userType === 'teacher';
  const isMetodist = user?.userType === 'metodist';

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser: setUserWithStorage, 
      isStudent, 
      isTeacher, 
      isMetodist,
      logout 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};