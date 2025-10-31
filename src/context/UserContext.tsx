import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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
  userType: 'teacher' | 'metodist' | 'departmentHead';
  email?: string;
  telephone?: string;
  birthDate?: string;
  address?: string;
}

export type User = Student | Staff;

// Интерфейс для сохраненной сессии
interface UserSession {
  user: User;
  timestamp: number;
  expiresAt: number;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isStudent: boolean;
  isTeacher: boolean;
  isMetodist: boolean;
  isDepartmentHead: boolean;
  isLoading: boolean;
  logout: () => void;
  userId: number | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

// Ключи для localStorage
const SESSION_STORAGE_KEY = 'user_session';
const SESSION_DURATION = 60 * 60 * 1000; // 1 час в миллисекундах

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isStudent = user?.userType === 'student';
  const isTeacher = user?.userType === 'teacher';
  const isMetodist = user?.userType === 'metodist';
  const isDepartmentHead = user?.userType === 'departmentHead';
  const userId = user?.id || null;

  // Сохранение пользователя в сессию
  const saveUserToSession = (userData: User) => {
    const session: UserSession = {
      user: userData,
      timestamp: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    console.log('Сессия пользователя сохранена');
  };

  // Восстановление пользователя из сессии
  const restoreUserFromSession = (): User | null => {
    try {
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionData) return null;

      const session: UserSession = JSON.parse(sessionData);
      
      // Проверяем не истекла ли сессия
      if (Date.now() > session.expiresAt) {
        console.log('Сессия истекла');
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      console.log('Сессия пользователя восстановлена');
      return session.user;
    } catch (error) {
      console.error('Ошибка при восстановлении сессии:', error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  };

  // Очистка сессии
  const clearSession = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    console.log('Сессия очищена');
  };

  // Функция выхода
  const logout = () => {
    setUser(null);
    clearSession();
    console.log('Пользователь вышел из системы');
  };

  // Обновленная функция setUser с сохранением в сессию
  const setUserWithSession = (userData: User | null) => {
    console.log('setUserWithSession called with:', userData);
    if (userData) {
      setUser(userData);
      saveUserToSession(userData);
      console.log('User set in context and session:', userData);
    } else {
      setUser(null);
      clearSession();
      console.log('User cleared from context and session');
    }
  };

  // Восстановление сессии при монтировании компонента
  useEffect(() => {
    const initializeUser = async () => {
      setIsLoading(true);
      
      try {
        const savedUser = restoreUserFromSession();
        
        if (savedUser) {
          setUser(savedUser);
          console.log('Пользователь автоматически авторизован');
        } else {
          console.log('Сессия не найдена или истекла');
          setUser(null);
        }
      } catch (error) {
        console.error('Ошибка при инициализации пользователя:', error);
        setUser(null);
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Автоматическое продление сессии при активности пользователя
  useEffect(() => {
    if (!user) return;

    const handleUserActivity = () => {
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionData && user) {
        try {
          const session: UserSession = JSON.parse(sessionData);
          // Продлеваем сессию только если осталось меньше 30 минут
          if (session.expiresAt - Date.now() < 30 * 60 * 1000) {
            saveUserToSession(user);
            console.log('Сессия продлена');
          }
        } catch (error) {
          console.error('Ошибка при продлении сессии:', error);
        }
      }
    };

    // Слушаем события активности пользователя
    const events = ['click', 'keypress', 'scroll', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [user]);

  const value: UserContextType = {
    user,
    setUser: setUserWithSession,
    isStudent,
    isTeacher,
    isMetodist,
    isDepartmentHead,
    isLoading,
    logout,
    userId
  };

  return (
    <UserContext.Provider value={value}>
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