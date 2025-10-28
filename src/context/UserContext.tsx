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
  userId: number | null; 
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const isStudent = user?.userType === 'student';
  const isTeacher = user?.userType === 'teacher';
  const isMetodist = user?.userType === 'metodist';
  
  const userId = user ? (user as any).id : null;

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      isStudent, 
      isTeacher, 
      isMetodist,
      userId 
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