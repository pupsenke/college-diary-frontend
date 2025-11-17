import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, Staff } from "../context/UserContext";
import "./LoginStyle.css";
import { apiService, GroupData, TeacherData } from '../services/studentApiService';
const API_BASE_URL = 'http://80.93.62.33:8080';

// Интерфейс для данных пользователя с возможными ролями
interface UserWithRoles {
  id: number;
  name: string;
  patronymic: string;
  lastName: string;
  login: string;
  email: string;
  telephone: string;
  birthDate: string;
  address: string;
  lastNameGenitive?: string | null;
  nameGenitive?: string | null;
  patronymicGenitive?: string | null;
  roles: Array<{
    type: 'student' | 'teacher' | 'metodist' | 'departmentHead';
    position?: string;
    staffPosition?: any[];
    idGroup?: number;
    numberGroup?: number;
  }>;
}

// Интерфейс для модального окна выбора роли
interface RoleSelectionModalProps {
  isOpen: boolean;
  user: UserWithRoles | null;
  onRoleSelect: (role: UserWithRoles['roles'][0]) => void;
  onClose: () => void;
}

export const LoginPage: React.FC = () => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [userWithRoles, setUserWithRoles] = useState<UserWithRoles | null>(null);
  const [isAuthSuccess, setIsAuthSuccess] = useState(false);
  
  const navigate = useNavigate();
  const { setUser, user } = useUser();

  useEffect(() => {
    if (isAuthSuccess && user) {
      
      switch (user.userType) {
        case 'student':
          navigate("/student", { replace: true });
          break;
        case 'teacher':
          navigate("/teacher", { replace: true });
          break;
        case 'metodist':
          navigate("/metodist", { replace: true });
          break;
        case 'departmentHead':
          navigate("/departmentHead", { replace: true });
          break;
        default:
          console.error('Unknown user type');
      }
      
      setIsAuthSuccess(false);
    }
  }, [isAuthSuccess, user, navigate]);

  const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ 
    isOpen, 
    user, 
    onRoleSelect, 
    onClose 
  }) => {
    if (!isOpen || !user) return null;

    const getRoleDisplayName = (role: UserWithRoles['roles'][0]) => {
      switch (role.type) {
        case 'student':
          return 'Студент';
        case 'teacher':
          return `Преподаватель`;
        case 'metodist':
          return `Методист`;
        case 'departmentHead':
          return `Заведующий отделением`;
        default:
          return role.type;
      }
    };

    const getRoleDescription = (role: UserWithRoles['roles'][0]) => {
      switch (role.type) {
        case 'student':
          return `Группа: ${role.numberGroup || role.idGroup}`;
        case 'teacher':
          return 'Доступ к функциям преподавателя';
        case 'metodist':
          return 'Доступ к методическим функциям';
        case 'departmentHead':
          return 'Доступ к управлению отделением';
        default:
          return '';
      }
    };

    return (
      <div className="lp-modal-overlay">
        <div className="lp-modal-content">
          <div className="lp-modal-header">
            <h3>Выберите роль для входа</h3>
            <p>У вашего аккаунта несколько ролей в системе</p>
          </div>
          
          <div className="lp-roles-list">
            {user.roles.map((role, index) => (
              <div 
                key={index} 
                className="lp-role-card"
                onClick={() => onRoleSelect(role)}
              >
                <div className="lp-role-header">
                  <h4>{getRoleDisplayName(role)}</h4>
                </div>
                <p className="lp-role-description">{getRoleDescription(role)}</p>
              </div>
            ))}
          </div>
          
          <div className="lp-modal-footer">
            <button 
              className="lp-cancel-button"
              onClick={onClose}
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleRoleSelection = (selectedRole: UserWithRoles['roles'][0]) => {
    if (!userWithRoles) return;

    const baseUserData = {
      id: userWithRoles.id,
      name: userWithRoles.name || "",
      patronymic: userWithRoles.patronymic || "",
      lastName: userWithRoles.lastName || "",
      login: userWithRoles.login || login,
      email: userWithRoles.email || "",
      telephone: userWithRoles.telephone || "",
      birthDate: userWithRoles.birthDate || "",
      address: userWithRoles.address || ""
    };

    let userData: any;

    switch (selectedRole.type) {
      case 'student':
        userData = {
          ...baseUserData,
          idGroup: selectedRole.idGroup!,
          numberGroup: selectedRole.numberGroup!,
          userType: 'student' as const,
          lastNameGenitive: userWithRoles.lastNameGenitive || userWithRoles.lastName || null,
          nameGenitive: userWithRoles.nameGenitive || userWithRoles.name || null,
          patronymicGenitive: userWithRoles.patronymicGenitive || userWithRoles.patronymic || null
        };
        break;

      case 'teacher':
      case 'metodist':
      case 'departmentHead':
        userData = {
          ...baseUserData,
          position: selectedRole.position || "",
          staffPosition: selectedRole.staffPosition || [],
          userType: selectedRole.type
        } as Staff;
        break;
    }

    setUser(userData);
    setIsAuthSuccess(true); 

    setShowRoleSelection(false);
    setUserWithRoles(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);
    setShowRoleSelection(false);
    setUserWithRoles(null);
    setIsAuthSuccess(false);

    if (!login.trim() || !password.trim()) {
      setErrorMessage("Пожалуйста, заполните все поля");
      setIsLoading(false);
      return;
    }

    try {
      const roles: UserWithRoles['roles'] = [];
      let userBaseData: Partial<UserWithRoles> = {};

      try {
        const studentData = await apiService.loginStudent(login, password);
        if (studentData && studentData.id) {
          let numberGroup = 0;
          try {
            const groupData = await apiService.getGroupData(studentData.idGroup);
            numberGroup = groupData.numberGroup;
          } catch (error) {
            console.error('Ошибка получения данных группы:', error);
            numberGroup = studentData.idGroup;
          }

          roles.push({
            type: 'student',
            idGroup: studentData.idGroup,
            numberGroup: numberGroup
          });

          userBaseData = {
            id: studentData.id,
            name: studentData.name || "",
            patronymic: studentData.patronymic || "",
            lastName: studentData.lastName || "",
            login: studentData.login || login,
            email: studentData.email || "",
            telephone: studentData.telephone || "",
            birthDate: studentData.birthDate || "",
            address: studentData.address || "",
            lastNameGenitive: studentData.lastNameGenitive || null,
            nameGenitive: studentData.nameGenitive || null,
            patronymicGenitive: studentData.patronymicGenitive || null
          };
        }
      } catch (studentError) {
      }

      const staffResponse = await fetch(
        `${API_BASE_URL}/api/v1/staffs/login/${encodeURIComponent(login)}/password/${encodeURIComponent(password)}`
      );

      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        if (staffData && staffData.id) {
          if (!userBaseData.id) {
            userBaseData = {
              id: staffData.id,
              name: staffData.name || "",
              patronymic: staffData.patronymic || "",
              lastName: staffData.lastName || "",
              login: staffData.login || login,
              email: staffData.email || "",
              telephone: staffData.telephone || "",
              birthDate: staffData.birthDate || "",
              address: staffData.address || ""
            };
          }

          if (staffData.staffPosition && staffData.staffPosition.length > 0) {
            for (const position of staffData.staffPosition) {
              const positionName = position.name || '';
              const lowerPosition = positionName.toLowerCase();
              
              let roleType: 'teacher' | 'metodist' | 'departmentHead' = 'teacher';
              
              if (lowerPosition.includes('методист')) {
                roleType = 'metodist';
              } else if (lowerPosition.includes('зав. отделением')) {
                roleType = 'departmentHead';
              } else if (lowerPosition.includes('преподаватель')) {
                roleType = 'teacher';
              }

              // Добавляем роль сотрудника
              roles.push({
                type: roleType,
                position: positionName,
                staffPosition: staffData.staffPosition || []
              });
            }
          }
        }
      }

      // Обработка результатов проверки
      if (roles.length === 0) {
        setErrorMessage("Неверный логин или пароль");
      } else {
        const userWithRolesData: UserWithRoles = {
          ...userBaseData,
          roles: roles
        } as UserWithRoles;

        setUserWithRoles(userWithRolesData);

        if (roles.length === 1) {
          
          const selectedRole = roles[0];
          const baseUserData = {
            id: userBaseData.id!,
            name: userBaseData.name || "",
            patronymic: userBaseData.patronymic || "",
            lastName: userBaseData.lastName || "",
            login: userBaseData.login || login,
            email: userBaseData.email || "",
            telephone: userBaseData.telephone || "",
            birthDate: userBaseData.birthDate || "",
            address: userBaseData.address || ""
          };

          let userData: any;

          if (selectedRole.type === 'student') {
            userData = {
              ...baseUserData,
              idGroup: selectedRole.idGroup!,
              numberGroup: selectedRole.numberGroup!,
              userType: 'student' as const,
              lastNameGenitive: userBaseData.lastNameGenitive || userBaseData.lastName || null,
              nameGenitive: userBaseData.nameGenitive || userBaseData.name || null,
              patronymicGenitive: userBaseData.patronymicGenitive || userBaseData.patronymic || null
            };
          } else {
            userData = {
              ...baseUserData,
              position: selectedRole.position || "",
              staffPosition: selectedRole.staffPosition || [],
              userType: selectedRole.type
            } as Staff;
          }

          setUser(userData);
          setIsAuthSuccess(true); 
        } else {
          setShowRoleSelection(true);
        }
      }
      
      } catch (err) {
        console.error("Ошибка авторизации:", err);
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

      <RoleSelectionModal
        isOpen={showRoleSelection}
        user={userWithRoles}
        onRoleSelect={handleRoleSelection}
        onClose={() => setShowRoleSelection(false)}
      />
    </div>
  );
};