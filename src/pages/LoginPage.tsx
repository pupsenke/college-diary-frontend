import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, Staff } from "../context/UserContext";
import "./LoginStyle.css";
import { apiService, GroupData, TeacherData } from '../services/studentApiService';


export const LoginPage: React.FC = () => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    // Валидация на пустые поля
    if (!login.trim() || !password.trim()) {
      setErrorMessage("Пожалуйста, заполните все поля");
      setIsLoading(false);
      return;
    }
    try {
      // Поиск студента
      const studentResponse = await fetch(
        `http://localhost:8080/api/v1/students/login/${encodeURIComponent(login)}/password/${encodeURIComponent(password)}`
      );

      if (studentResponse.ok) {
        const studentData = await studentResponse.json();
        if (studentData && studentData.id) {
        // Получение данных группы чтобы получить numberGroup
        let numberGroup = 0;
        try {
          const groupData = await apiService.getGroupData(studentData.idGroup);
          numberGroup = groupData.numberGroup;
        } catch (error) {
          console.error('Error fetching group data:', error);

          numberGroup = studentData.idGroup; // временное значение
        }

    const userData = {
      id: studentData.id,
      name: studentData.name || "",
      patronymic: studentData.patronymic || "",
      lastName: studentData.lastName || "",
      login: studentData.login || login,
      idGroup: studentData.idGroup,
      numberGroup: numberGroup,
      email: studentData.email || "",
      telephone: studentData.telephone || "",
      birthDate: studentData.birthDate || "",
      address: studentData.address || "",
      userType: 'student' as const
    };
    
    console.log('Student user data:', userData);
    setUser(userData);
    navigate("/student", { replace: true });
    return;
  }
}

      // Если студент не найден, поиск сотрудника
      const staffResponse = await fetch(
        `http://localhost:8080/api/v1/staffs/login/${encodeURIComponent(login)}/password/${encodeURIComponent(password)}`
      );

      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        if (staffData && staffData.id) {
          // Определяем тип пользователя на основе должности
          let userType: 'teacher' | 'metodist' = 'teacher';
          let positionName = '';
          
          if (staffData.staffPosition && staffData.staffPosition.length > 0) {
            positionName = staffData.staffPosition[0].name || '';
            
            const lowerPosition = positionName.toLowerCase();
            if (lowerPosition.includes('методист')) {
              userType = 'metodist';
            } else if (lowerPosition.includes('преподаватель') || lowerPosition.includes('учитель')) {
              userType = 'teacher';
            }
          }

          const userData: Staff = {
            id: staffData.id,
            name: staffData.name || "",
            patronymic: staffData.patronymic || "",
            lastName: staffData.lastName || "",
            login: staffData.login || login,
            position: positionName,
            staffPosition: staffData.staffPosition || [],
            userType: userType,
            email: staffData.email || "",
            telephone: staffData.telephone || "",
            birthDate: staffData.birthDate || "",
            address: staffData.address || ""
          };
          
          setUser(userData);
          
          // Перенаправление на нужную панель в зависимости от типа пользователя
          if (userType === 'metodist') {
            navigate("/metodist", { replace: true });
          } else {
            navigate("/teacher", { replace: true });
          }
          return;
        }
      }

      // Если оба запроса вернули ошибку
      if (studentResponse.status === 404 && staffResponse.status === 404) {
        setErrorMessage("Неверный логин или пароль");
      } else if (studentResponse.status === 500 || staffResponse.status === 500) {
        setErrorMessage("Ошибка сервера. Попробуйте позже.");
      } else {
        setErrorMessage("Ошибка при подключении к серверу");
      }
      
    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage("Ошибка при попытке входа. Проверьте подключение к интернету.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  const handleSupportClick = () => {
    window.open('https://t.me/digital_diary_support', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="login-container">
      <div className="background-animation">
        <div className="shape login-shape-1"></div>
        <div className="shape login-shape-2"></div>
        <div className="shape login-shape-3"></div>
      </div>

      <div className="login-content">
        <div className="login-header">
          <h1 className="login-title">Цифровой дневник</h1>
          <p className="login-subtitle">Политехнический колледж НовГУ</p>
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="card-header">
            <h2 className="auth-headline">Добро пожаловать</h2>
            <p className="auth-desc">Введите данные для входа в систему</p>
          </div>

          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}

          <div className="input-group-login">
            <div className="input-field">
              <input
                type="text"
                placeholder="Логин"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="login-input"
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="input-group-password">
            <div className="input-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="password-input"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
                tabIndex={-1}
              >
              <span className={`eye-icon ${showPassword ? 'eye-open' : 'eye-closed'}`}></span>
              </button>
            </div>
          </div>

          {/* <div className="forgot-row">
            <button 
              type="button" 
              className="forgot-link"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Забыли пароль?
            </button>
          </div> */}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !login.trim() || !password.trim()}
          >
            {isLoading ? (
              <span className="loading-text">
                <span className="spinner"></span>
                Вход...
              </span>
            ) : (
              'Войти в систему'
            )}
          </button>

          <div className="login-footer">
            <p className="support-text">
              Возникли проблемы?{" "}
              <a 
                type="button" 
                className="support-link"
                onClick={handleSupportClick}
              >
                Служба поддержки
              </a>
            </p>
          </div>
        </form>

        <div className="version-info">
          Версия 1.0.0 • © 2025 Дневник ПТК
        </div>
      </div>
    </div>
  );
};