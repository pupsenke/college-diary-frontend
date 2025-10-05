import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ForgotPasswordStyle.css";

export const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      // Заглушка для отправки кода на почту
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // В реальном приложении здесь будет запрос к API
      console.log("Код отправлен на почту:", email);
      
      setStep("code");
    } catch (err) {
      setErrorMessage("Ошибка при отправке кода. Попробуйте позже.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const fullCode = code.join("");
      
      // Заглушка для проверки кода
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // В реальном приложении здесь будет запрос к API для проверки кода
      if (fullCode === "123456") { // Заглушка для демонстрации
        setStep("success");
        
        // Через 3 секунды перенаправляем на страницу входа
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setErrorMessage("Неверный код подтверждения");
      }
    } catch (err) {
      setErrorMessage("Ошибка при проверке кода. Попробуйте позже.");
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

      // Автопереход к следующему полю
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
            {/* <button 
              className="fp-back-button"
              onClick={handleBackToLogin}
              type="button"
            >
              Назад
            </button> */}
            <img src="blue_toggle_icon_back.svg" alt="" className="fp-back-button" onClick={handleBackToLogin}/>
            <h2 className="fp-headline">
              {step === "email" && "Восстановление пароля"}
              {step === "code" && "Подтверждение почты"}
              {step === "success" && "Пароль отправлен"}
            </h2>
            <p className="fp-desc">
              {step === "email" && "Введите вашу почту для получения кода подтверждения"}
              {step === "code" && `Введите 6-значный код, отправленный на ${email}`}
              {step === "success" && "Новый пароль был отправлен на вашу почту"}
            </p>
          </div>

          {errorMessage && (
            <div className="fp-error-message">
              {errorMessage}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleEmailSubmit}>
              <div className="fp-input-group">
                <div className="fp-input-field">
                  <input
                    type="email"
                    placeholder="Ваша почта"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="fp-email-input"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="fp-submit-button"
                disabled={isLoading || !email}
              >
                {isLoading ? 'Отправка...' : 'Далее'}
              </button>
            </form>
          )}

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
                <p className="fp-code-hint">Введите 6-значный код из письма</p>
              </div>

              <div className="fp-code-actions">
                <button
                  type="button"
                  className="fp-resend-button"
                  onClick={handleEmailSubmit}
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
            </form>
          )}

          {step === "success" && (
            <div className="fp-success-content">
              <div className="fp-success-icon">✓</div>
              <p className="fp-success-message">
                Новый пароль был отправлен на вашу почту.
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
          Версия 1.0.0 • © 2025 Дневник ПТК
        </div>
      </div>
    </div>
  );
};