import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface User {
  id: number;
  name: string;
  surname: string;
  lastName: string;
  login: string;
  userType: 'student' | 'teacher'; // Добавляем тип пользователя
  numberGroup?: number; // Только для студентов
  disciplinesCount?: number; // для преподавателей
  groupsCount?: number; // для преподавателей
  email: string; // для преподавателей
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const updateUser = (userData: User | null) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser: updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};