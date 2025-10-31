import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, Staff } from "../context/UserContext";
import "./LoginStyle.css";
import { apiService, GroupData, TeacherData } from '../services/studentApiService';

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
  const navigate = useNavigate();
  const { setUser } = useUser();

  // Компонент модального окна для выбора роли
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
          return `Преподаватель${role.position ? ` (${role.position})` : ''}`;
        case 'metodist':
          return `Методист${role.position ? ` (${role.position})` : ''}`;
        case 'departmentHead':
          return `Заведующий отделением${role.position ? ` (${role.position})` : ''}`;
        default:
          return role.type;
      }
    };

    const getRoleDescription = (role: UserWithRoles['roles'][0]) => {
      switch (role.type) {
        case 'student':
          return `Группа: ${role.numberGroup || role.idGroup}`;
        case 'teacher':
          return 'Доступ к преподавательским функциям';
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

  switch (selectedRole.type) {
    case 'student':
      const studentData = {
        ...baseUserData,
        idGroup: selectedRole.idGroup!,
        numberGroup: selectedRole.numberGroup!,
        userType: 'student' as const
      };
      console.log('Setting student user:', studentData);
      setUser(studentData);
      navigate("/student", { replace: true });
      break;

    case 'teacher':
    case 'metodist':
    case 'departmentHead':
      const staffData: Staff = {
        ...baseUserData,
        position: selectedRole.position || "",
        staffPosition: selectedRole.staffPosition || [],
        userType: selectedRole.type
      };
      
      console.log('Setting staff user:', staffData);
      setUser(staffData);
      
      // Добавляем небольшую задержку чтобы контекст успел обновиться
      setTimeout(() => {
        // Перенаправление в зависимости от роли
        switch (selectedRole.type) {
          case 'metodist':
            navigate("/metodist", { replace: true });
            break;
          case 'departmentHead':
            navigate("/departmentHead", { replace: true });
            break;
          case 'teacher':
          default:
            navigate("/teacher", { replace: true });
            break;
        }
      }, 100);
      break;
  }

  setShowRoleSelection(false);
  setUserWithRoles(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrorMessage("");
  setIsLoading(true);
  setShowRoleSelection(false);
  setUserWithRoles(null);

  if (!login.trim() || !password.trim()) {
    setErrorMessage("Пожалуйста, заполните все поля");
    setIsLoading(false);
    return;
  }

  try {
    const roles: UserWithRoles['roles'] = [];
    let userBaseData: Partial<UserWithRoles> = {};

    // Поиск студента
    const studentResponse = await fetch(
      `http://localhost:8080/api/v1/students/login/${encodeURIComponent(login)}/password/${encodeURIComponent(password)}`
    );

    if (studentResponse.ok) {
      const studentData = await studentResponse.json();
      if (studentData && studentData.id) {
        let numberGroup = 0;
        try {
          const groupData = await apiService.getGroupData(studentData.idGroup);
          numberGroup = groupData.numberGroup;
        } catch (error) {
          console.error('Error fetching group data:', error);
          numberGroup = studentData.idGroup;
        }

        roles.push({
          type: 'student',
          idGroup: studentData.idGroup,
          numberGroup: numberGroup
        });

        // Сохраняем базовые данные пользователя из студента
        userBaseData = {
          id: studentData.id,
          name: studentData.name || "",
          patronymic: studentData.patronymic || "",
          lastName: studentData.lastName || "",
          login: studentData.login || login,
          email: studentData.email || "",
          telephone: studentData.telephone || "",
          birthDate: studentData.birthDate || "",
          address: studentData.address || ""
        };
      }
    }

    // Поиск сотрудника
    const staffResponse = await fetch(
      `http://localhost:8080/api/v1/staffs/login/${encodeURIComponent(login)}/password/${encodeURIComponent(password)}`
    );

    if (staffResponse.ok) {
      const staffData = await staffResponse.json();
      if (staffData && staffData.id) {
        // Если у нас еще нет базовых данных от студента, берем их от сотрудника
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

        // Определяем роли сотрудника на основе должностей
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

            // Добавляем роль сотрудника (не перезаписывая существующие)
            roles.push({
              type: roleType,
              position: positionName,
              staffPosition: staffData.staffPosition || []
            });
          }
        } else {
          // Если нет информации о должностях, используем teacher по умолчанию
          roles.push({
            type: 'teacher',
            position: '',
            staffPosition: []
          });
        }
      }
    }

    // Обработка результатов проверки
    if (roles.length === 0) {
      if (studentResponse.status === 404 && staffResponse.status === 404) {
        setErrorMessage("Неверный логин или пароль");
      } else if (studentResponse.status === 500 || staffResponse.status === 500) {
        setErrorMessage("Ошибка сервера. Попробуйте позже.");
      } else {
        setErrorMessage("Ошибка при подключении к серверу");
      }
    } else {
      // Создаем объект пользователя с ВСЕМИ ролями
      const userWithRolesData: UserWithRoles = {
        ...userBaseData,
        roles: roles
      } as UserWithRoles;

      setUserWithRoles(userWithRolesData);

      if (roles.length === 1) {
        // Если только одна роль, сразу авторизуем
        handleRoleSelection(roles[0]);
      } else {
        // Если несколько ролей, показываем выбор
        setShowRoleSelection(true);
      }
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