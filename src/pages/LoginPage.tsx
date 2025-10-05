import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "./LoginStyle.css";

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

    try {
      const studentResponse = await fetch(
        `http://localhost:8080/api/v1/students/login/${encodeURIComponent(login)}/password/${encodeURIComponent(password)}`
      );

      if (studentResponse.ok) {
        const studentData = await studentResponse.json();
        if (studentData && studentData.id) {
          const userData = {
            id: studentData.id,
            name: studentData.name,
            surname: studentData.surname,
            lastName: studentData.lastName,
            login: studentData.login,
            numberGroup: studentData.numberGroup,
            userType: 'student' as const
          };
          
          setUser(userData);
          navigate("/student", { replace: true });
          return;
        }
      }

      // Если студент не найден, пробуем как преподаватель
      const teacherResponse = await fetch(
        `http://localhost:8080/api/v1/teachers/login/${encodeURIComponent(login)}/password/${encodeURIComponent(password)}`
      );

      if (teacherResponse.ok) {
        const teacherData = await teacherResponse.json();
        if (teacherData && teacherData.id) {
          const userData = {
            id: teacherData.id,
            name: teacherData.name,
            surname: teacherData.surname,
            lastName: teacherData.lastName,
            login: teacherData.login,
            userType: 'teacher' as const
          };
          
          setUser(userData);
          navigate("/teacher", { replace: true });
          return;
        }
      }

      // Если оба запроса не прошли
      setErrorMessage("Неверный логин или пароль");
      
    } catch (err) {
      setErrorMessage("Ошибка при попытке входа. Попробуйте позже.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
            <div className="error-message" style={{ color: "red", marginBottom: "10px" }}>
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
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
              >
                <span className={`eye-icon ${showPassword ? 'eye-open' : 'eye-closed'}`}></span>
              </button>
            </div>
          </div>

          <div className="forgot-row">
            <button 
              type="button" 
              className="forgot-link"
              onClick={() => navigate("/forgot-password")}
            >
              Забыли пароль?
            </button>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Вход...' : 'Войти в систему'}
          </button>

          <div className="login-footer">
            <p className="support-text">
              Возникли проблемы?{" "}
              <a href="https://t.me/digital_diary_support" className="support-link">
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