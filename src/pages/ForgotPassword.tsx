import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ForgotPasswordStyle.css";
import { API_BASE_URL } from '../constants/apiConstant';

export const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<"login" | "email" | "code" | "newPassword" | "success">("login");
  const [loginOrEmail, setLoginOrEmail] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [userType, setUserType] = useState<'student' | 'staff' | null>(null);
  const [userCurrentEmail, setUserCurrentEmail] = useState<string | null>(null);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const navigate = useNavigate();

  // Получение данных пользователя по логину или email
  const getUserByLoginOrEmail = async (value: string): Promise<{ id: number; type: 'student' | 'staff'; email: string | null } | null> => {
    try {
      // Проверяем среди студентов
      const studentsResponse = await fetch(`${API_BASE_URL}/api/v1/students`);
      if (studentsResponse.ok) {
        const students = await studentsResponse.json();
        const student = students.find((s: any) => 
          s.login === value || s.email === value
        );
        if (student) {
          return { 
            id: student.id, 
            type: 'student', 
            email: student.email || null 
          };
        }
      }

      // Проверяем среди сотрудников
      const staffResponse = await fetch(`${API_BASE_URL}/api/v1/staffs`);
      if (staffResponse.ok) {
        const staff = await staffResponse.json();
        const staffMember = staff.find((s: any) => 
          s.login === value || s.email === value
        );
        if (staffMember) {
          return { 
            id: staffMember.id, 
            type: 'staff', 
            email: staffMember.email || null 
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Ошибка при поиске пользователя:', error);
      return null;
    }
  };

  // Отправка кода на почту
  const sendCodeToEmail = async (emailAddress: string, userId: number): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/email/code/active/${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Ошибка отправки кода: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Ошибка при отправке кода:', error);
      return false;
    }
  };

  // Проверка кода (без смены пароля)
  const verifyCode = async (userId: number, code: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/email/password/id/${userId}/change/${code}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Ошибка при проверке кода:', error);
      return false;
    }
  };

  // Смена пароля
  const changePassword = async (userId: number, newPassword: string, userType: 'student' | 'staff'): Promise<boolean> => {
    try {
      const updateData = { id: userId, password: newPassword };
      
      const endpoint = userType === 'student' 
        ? `${API_BASE_URL}/api/v1/students/update`
        : `${API_BASE_URL}/api/v1/staffs/update`;
      
      const updateResponse = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      return updateResponse.ok;
    } catch (error) {
      console.error('Ошибка при смене пароля:', error);
      return false;
    }
  };

  // Обновление email пользователя
  const updateUserEmail = async (userId: number, newEmail: string, userType: 'student' | 'staff'): Promise<boolean> => {
    try {
      if (userType === 'student') {
        // Получаем текущие данные студента
        const getResponse = await fetch(`${API_BASE_URL}/api/v1/students/id/${userId}`);
        if (!getResponse.ok) return false;
        
        const studentData = await getResponse.json();
        
        // Обновляем только email, остальные поля оставляем без изменений
        const updateData = {
          id: userId,
          lastName: studentData.lastName,
          name: studentData.name,
          patronymic: studentData.patronymic,
          lastNameGenitive: studentData.lastNameGenitive,
          nameGenitive: studentData.nameGenitive,
          patronymicGenitive: studentData.patronymicGenitive,
          idGroup: studentData.idGroup,
          login: studentData.login,
          password: studentData.password,
          telephone: studentData.telephone,
          birthDate: studentData.birthDate,
          address: studentData.address,
          email: newEmail,
          code: studentData.code
        };
        
        const updateResponse = await fetch(`${API_BASE_URL}/api/v1/students/update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        
        return updateResponse.ok;
      } else {
        // Получаем текущие данные сотрудника
        const getResponse = await fetch(`${API_BASE_URL}/api/v1/staffs/id/${userId}`);
        if (!getResponse.ok) return false;
        
        const staffData = await getResponse.json();
        
        const updateData = {
          id: userId,
          lastName: staffData.lastName,
          name: staffData.name,
          patronymic: staffData.patronymic,
          login: staffData.login,
          email: newEmail,
          telephone: staffData.telephone,
          birthDate: staffData.birthDate,
          address: staffData.address
        };
        
        const updateResponse = await fetch(`${API_BASE_URL}/api/v1/staffs/update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        
        return updateResponse.ok;
      }
    } catch (error) {
      console.error('Ошибка при обновлении email:', error);
      return false;
    }
  };

  // Шаг 1: Поиск пользователя по логину или email
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    if (!loginOrEmail.trim()) {
      setErrorMessage("Пожалуйста, введите логин или email");
      setIsLoading(false);
      return;
    }

    try {
      const user = await getUserByLoginOrEmail(loginOrEmail);
      
      if (!user) {
        setErrorMessage("Пользователь с таким логином или email не найден");
        setIsLoading(false);
        return;
      }

      setUserId(user.id);
      setUserType(user.type);
      setUserCurrentEmail(user.email);

      // Если у пользователя есть email в профиле
      if (user.email) {
        setEmail(user.email);
        setSuccessMessage(`Код подтверждения отправлен на ${user.email}`);
        
        // Отправляем код на существующую почту
        const codeSent = await sendCodeToEmail(user.email, user.id);
        
        if (codeSent) {
          setStep("code");
        } else {
          setErrorMessage("Ошибка при отправке кода. Попробуйте позже.");
        }
      } else {
        // Если email отсутствует, переходим к вводу email
        setStep("email");
        setErrorMessage("У вашего аккаунта не привязана почта. Пожалуйста, укажите email для восстановления пароля.");
      }
      
    } catch (err) {
      setErrorMessage("Ошибка при поиске пользователя. Попробуйте позже.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Шаг 2: Ввод email (если его нет в профиле)
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage("Пожалуйста, введите корректный email");
      setIsLoading(false);
      return;
    }

    if (!userId || !userType) {
      setErrorMessage("Ошибка: пользователь не найден");
      setIsLoading(false);
      return;
    }

    try {
      // Обновляем email пользователя
      const emailUpdated = await updateUserEmail(userId, email, userType);
      
      if (!emailUpdated) {
        setErrorMessage("Ошибка при сохранении email. Попробуйте позже.");
        setIsLoading(false);
        return;
      }

      setUserCurrentEmail(email);
      setSuccessMessage(`Email успешно сохранен! Код подтверждения отправлен на ${email}`);
      
      // Отправляем код на новую почту
      const codeSent = await sendCodeToEmail(email, userId);
      
      if (codeSent) {
        setStep("code");
      } else {
        setErrorMessage("Ошибка при отправке кода. Попробуйте позже.");
      }
      
    } catch (err) {
      setErrorMessage("Ошибка при сохранении email. Попробуйте позже.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Шаг 3: Подтверждение кода
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const fullCode = code.join("");
      
      if (fullCode.length !== 6) {
        setErrorMessage("Введите полный 6-значный код");
        setIsLoading(false);
        return;
      }

      if (!userId) {
        setErrorMessage("Ошибка: пользователь не найден");
        setIsLoading(false);
        return;
      }

      // Проверяем код
      const codeValid = await verifyCode(userId, fullCode);
      
      if (!codeValid) {
        setErrorMessage("Неверный или просроченный код подтверждения");
        setIsLoading(false);
        return;
      }

      // Код верный, переходим к смене пароля
      setStep("newPassword");
      setSuccessMessage("Код подтвержден! Введите новый пароль.");
      
    } catch (err) {
      setErrorMessage("Ошибка при проверке кода. Попробуйте позже.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Шаг 4: Смена пароля
  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setErrorMessage("Пароли не совпадают");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Пароль должен содержать не менее 6 символов");
      setIsLoading(false);
      return;
    }

    if (!userId || !userType) {
      setErrorMessage("Ошибка: пользователь не найден");
      setIsLoading(false);
      return;
    }

    try {
      const passwordChanged = await changePassword(userId, newPassword, userType);
      
      if (passwordChanged) {
        setStep("success");
        setSuccessMessage("Пароль успешно изменен!");
        
        // Через 3 секунды перенаправляем на страницу входа
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setErrorMessage("Ошибка при смене пароля. Попробуйте позже.");
      }
    } catch (err) {
      setErrorMessage("Ошибка при смене пароля. Попробуйте позже.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Смена email (если пользователь хочет изменить почту)
  const handleChangeEmail = () => {
    setShowEmailChange(true);
    setNewEmail("");
    setErrorMessage("");
  };

  const handleEmailChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    if (!newEmail.trim() || !newEmail.includes('@')) {
      setErrorMessage("Пожалуйста, введите корректный email");
      setIsLoading(false);
      return;
    }

    if (!userId || !userType) {
      setErrorMessage("Ошибка: пользователь не найден");
      setIsLoading(false);
      return;
    }

    try {
      // Обновляем email
      const emailUpdated = await updateUserEmail(userId, newEmail, userType);
      
      if (!emailUpdated) {
        setErrorMessage("Ошибка при смене email. Попробуйте позже.");
        setIsLoading(false);
        return;
      }

      setEmail(newEmail);
      setUserCurrentEmail(newEmail);
      setShowEmailChange(false);
      setSuccessMessage(`Email успешно изменен на ${newEmail}. Новый код отправлен на почту.`);
      
      // Отправляем новый код на новую почту
      const codeSent = await sendCodeToEmail(newEmail, userId);
      
      if (codeSent) {
        // Очищаем поля кода
        setCode(["", "", "", "", "", ""]);
      } else {
        setErrorMessage("Ошибка при отправке кода на новую почту");
      }
      
    } catch (err) {
      setErrorMessage("Ошибка при смене email. Попробуйте позже.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      if (value && index < 5) {
        const nextInput = document.getElementById(`fp-code-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`fp-code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleResendCode = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    const targetEmail = showEmailChange ? newEmail : email;
    
    if (!targetEmail) {
      setErrorMessage("Email не указан");
      setIsLoading(false);
      return;
    }
    
    const codeSent = await sendCodeToEmail(targetEmail, userId);
    if (codeSent) {
      setSuccessMessage("Код повторно отправлен на вашу почту");
    } else {
      setErrorMessage("Ошибка при повторной отправке кода");
    }
    setIsLoading(false);
  };

  return (
    <div className="fp-container">
      <div className="fp-background-animation">
        <div className="fp-shape fp-shape-1"></div>
        <div className="fp-shape fp-shape-2"></div>
        <div className="fp-shape fp-shape-3"></div>
      </div>

      <div className="fp-content">
        <div className="fp-login-header">
          <h1 className="fp-login-title">Цифровой дневник</h1>
          <p className="fp-login-subtitle">Политехнический колледж НовГУ</p>
        </div>

        <div className="fp-card">
          <div className="fp-card-header">
            <img src="blue_toggle_icon_back.svg" alt="" className="fp-back-button" onClick={handleBackToLogin}/>
            <h2 className="fp-headline">
              {step === "login" && "Восстановление пароля"}
              {step === "email" && "Укажите email"}
              {step === "code" && "Подтверждение"}
              {step === "newPassword" && "Новый пароль"}
              {step === "success" && "Готово!"}
            </h2>
            <p className="fp-desc">
              {step === "login" && "Введите логин или email для восстановления доступа"}
              {step === "email" && "Укажите email для восстановления пароля"}
              {step === "code" && `Введите код, отправленный на ${showEmailChange ? newEmail : email}`}
              {step === "newPassword" && "Придумайте новый надежный пароль"}
              {step === "success" && "Ваш пароль успешно изменен"}
            </p>
          </div>

          {errorMessage && (
            <div className="fp-error-message">
              {errorMessage}
            </div>
          )}

          {successMessage && step !== "newPassword" && step !== "code" && (
            <div className="fp-success-alert">
              {successMessage}
            </div>
          )}

          {/* Шаг 1: Ввод логина/email */}
          {step === "login" && (
            <form onSubmit={handleLoginSubmit}>
              <div className="fp-input-group">
                <div className="fp-input-field">
                  <input
                    type="text"
                    placeholder="Логин или Email"
                    value={loginOrEmail}
                    onChange={(e) => setLoginOrEmail(e.target.value)}
                    className="fp-email-input"
                    required
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="fp-submit-button"
                disabled={isLoading || !loginOrEmail.trim()}
              >
                {isLoading ? 'Поиск...' : 'Продолжить'}
              </button>
            </form>
          )}

          {/* Шаг 2: Ввод email (если нет в профиле) */}
          {step === "email" && (
            <form onSubmit={handleEmailSubmit}>
              <div className="fp-input-group">
                <div className="fp-input-field">
                  <input
                    type="email"
                    placeholder="Ваш email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="fp-email-input"
                    required
                    disabled={isLoading}
                  />
                </div>
                <p className="fp-code-hint">На этот email будет отправлен код для восстановления пароля</p>
              </div>

              <button
                type="submit"
                className="fp-submit-button"
                disabled={isLoading || !email}
              >
                {isLoading ? 'Отправка...' : 'Отправить код'}
              </button>
            </form>
          )}

          {/* Шаг 3: Ввод кода */}
          {step === "code" && (
            <form onSubmit={handleCodeSubmit}>
              <div className="fp-code-group">
                <div className="fp-code-inputs">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      id={`fp-code-${index}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="fp-code-input"
                      required
                      disabled={isLoading}
                    />
                  ))}
                </div>
                
                {userCurrentEmail && !showEmailChange && (
                  <p className="fp-code-hint">
                    Код отправлен на {userCurrentEmail}
                    <button 
                      type="button"
                      className="fp-change-email-link"
                      onClick={handleChangeEmail}
                      style={{ marginLeft: '10px', color: '#002FA7', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Сменить email
                    </button>
                  </p>
                )}
                
                {showEmailChange && (
                  <div className="fp-email-change-form" style={{ marginTop: '15px', padding: '15px', borderTop: '1px solid #e2e8f0' }}>
                    <p className="fp-code-hint" style={{ marginBottom: '10px', color: '#002FA7' }}>Смена email:</p>
                    <input
                      type="email"
                      placeholder="Новый email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="fp-email-input"
                      style={{ marginBottom: '10px' }}
                      disabled={isLoading}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        className="fp-resend-button"
                        onClick={handleEmailChangeSubmit}
                        disabled={isLoading || !newEmail}
                        style={{ flex: 1 }}
                      >
                        Сохранить и отправить код
                      </button>
                      <button
                        type="button"
                        className="fp-cancel-button"
                        onClick={() => setShowEmailChange(false)}
                        disabled={isLoading}
                        style={{ flex: 1, background: '#f1f5f9', color: '#64748b' }}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!showEmailChange && (
                <>
                  <div className="fp-code-actions">
                    <button
                      type="button"
                      className="fp-resend-button"
                      onClick={handleResendCode}
                      disabled={isLoading}
                    >
                      Отправить код повторно
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="fp-submit-button"
                    disabled={isLoading || code.some(digit => !digit)}
                  >
                    {isLoading ? 'Проверка...' : 'Подтвердить'}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Шаг 4: Новый пароль */}
          {step === "newPassword" && (
            <form onSubmit={handleNewPasswordSubmit}>
              <div className="fp-input-group">
                <div className="fp-input-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Новый пароль"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="fp-email-input"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
              </div>

              <div className="fp-input-group">
                <div className="fp-input-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Подтвердите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="fp-email-input"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
              </div>

              <div className="fp-code-actions">
                <button
                  type="button"
                  className="fp-resend-button"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                </button>
              </div>

              <button
                type="submit"
                className="fp-submit-button"
                disabled={isLoading || !newPassword || !confirmPassword}
              >
                {isLoading ? 'Смена пароля...' : 'Сменить пароль'}
              </button>
            </form>
          )}

          {/* Шаг 5: Успех */}
          {step === "success" && (
            <div className="fp-success-content">
              <div className="fp-success-icon">✓</div>
              <p className="fp-success-message">
                Ваш пароль был успешно изменен!
                <br />
                Вы будете перенаправлены на страницу входа...
              </p>
            </div>
          )}

          <div className="fp-footer">
            <p className="fp-support-text">
              Возникли проблемы?{" "}
              <a href="#" className="fp-support-link">
                Служба поддержки
              </a>
            </p>
          </div>
        </div>

        <div className="fp-version-info">
          Версия 1.0.0 • © 2026 Дневник ПТК
        </div>
      </div>
    </div>
  );
};