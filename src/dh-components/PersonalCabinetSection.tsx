import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { headApiService } from '../services/headApiService';
import { methodistApiService, PathTypeResponse } from '../services/methodistApiService';
import './PersonalCabinetSectionStyle.css';

interface StaffProfileData {
  id: number;
  email?: string;
}

interface PersonalCabinetSectionProps {
  onClose?: () => void;
}

interface DocumentFile {
  id: number;
  name: string;
  fileName: string;
  pathToFile: string;
  type: string;
  uploadDate: string;
}

export const PersonalCabinetSection: React.FC<PersonalCabinetSectionProps> = ({ onClose }) => {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [staffProfile, setStaffProfile] = useState<StaffProfileData | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [email, setEmail] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadStaffProfile = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const profile: StaffProfileData = {
          id: user.id,
          email: user.email || 'нет в апи'
        };

        setStaffProfile(profile);
        setEmail(profile.email || '');
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStaffProfile();
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  // Загрузка документов с сервера
const loadDocuments = async () => {
  if (!user) return;
  
  setIsLoadingDocuments(true);
  try {
    const documentTypes = [
      'staff_document',           // документы, загруженные вручную
      'summary_statement',        // Excel ведомости
      'attestation_direction',    // направления на обычную аттестацию
      'attestation_commission',    // направления на аттестацию комиссией
      'session_attestation',       // Аттестационная ведомость
      'scholarship'               // Стипендии
    ];
    let allDocuments: DocumentFile[] = [];
    
    for (const docType of documentTypes) {
      try {
        const files = await methodistApiService.getFilesByType(docType);
        let filesArray: PathTypeResponse[] = Array.isArray(files) ? files : [files];
        
        
        const mappedDocuments: DocumentFile[] = files.map(file => ({
          id: file.id,
          name: file.nameFile || extractFileName(file.pathToFile),
          fileName: file.nameFile,
          pathToFile: file.pathToFile,
          type: docType,
          uploadDate: new Date().toLocaleDateString('ru-RU')
        }));
        
        allDocuments = [...allDocuments, ...mappedDocuments];
      } catch (err) {
        console.error(`Ошибка загрузки документов типа ${docType}:`, err);
      }
    }
    
    setDocuments(allDocuments);
  } catch (error) {
    console.error('Ошибка загрузки документов:', error);
  } finally {
    setIsLoadingDocuments(false);
  }
};

  const extractFileName = (path: string): string => {
    if (!path) return 'Документ';
    const parts = path.split('/');
    return parts[parts.length - 1] || 'Документ';
  };

  // Загрузка документа на сервер
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      alert('Недопустимый тип файла. Разрешены: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер: 10MB');
      return;
    }
    
    setUploadingFile(true);
    try {
      const result = await methodistApiService.uploadFile(file, 'staff_document', user?.id);
      
      const newDocument: DocumentFile = {
        id: result.id,
        name: file.name,
        fileName: result.nameFile,
        pathToFile: result.pathToFile,
        type: 'staff_document',
        uploadDate: new Date().toLocaleDateString('ru-RU')
      };
      
      setDocuments(prev => [...prev, newDocument]);
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      alert('Ошибка при загрузке документа. Пожалуйста, попробуйте снова.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Скачивание документа
  const handleDownloadDocument = async (doc: DocumentFile) => {
    try {
      const blob = await methodistApiService.downloadFile(doc.id);
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания документа:', error);
      alert('Ошибка при скачивании документа');
    }
  };

  // Удаление документа
  const handleDeleteDocument = async (doc: DocumentFile) => {
    if (window.confirm(`Вы уверены, что хотите удалить документ "${doc.name}"?`)) {
      try {
        await methodistApiService.deleteFile(doc.id);
        setDocuments(prev => prev.filter(d => d.id !== doc.id));
      } catch (error) {
        console.error('Ошибка удаления документа:', error);
        alert('Ошибка при удалении документа');
      }
    }
  };

  if (!user) {
    return (
      <div className="dh-pc-section dh-pc-personal-section">
        <div className="dh-pc-section-header">
          <h1 className="dh-pc-section-title">Личный кабинет</h1>
        </div>
        <div className="dh-pc-personal-content">
          <div className="dh-pc-not-authorized">
            <h3>Пользователь не авторизован</h3>
            <p>Пожалуйста, войдите в систему</p>
          </div>
        </div>
      </div>
    );
  }

  const userProfile = {
    lastName: user.lastName || '',
    firstName: user.name || '',
    patronymic: user.patronymic || '',
    email: staffProfile?.email || user.email || ''
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (formErrors.email) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Введите корректный email';
    }
    return errors;
  };

  const handleSaveProfile = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsLoading(true);

      const updateData = {
        id: user.id,
        email: email.trim() || undefined
      };

      await headApiService.updateStaff(updateData);

      setStaffProfile(prev => prev ? {
        ...prev,
        email: email
      } : null);

      setIsEditing(false);
      alert('Данные успешно обновлены!');
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
      alert('Ошибка при обновлении данных. Пожалуйста, попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Новый пароль и подтверждение не совпадают');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('Новый пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      setIsLoading(true);

      const changePasswordData = {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
        userId: user.id
      };

      await headApiService.changePassword(changePasswordData);

      alert('Пароль успешно изменен!');
      setIsPasswordModalOpen(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Ошибка при смене пароля:', error);
      alert(error.message || 'Ошибка при смене пароля. Проверьте текущий пароль.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEmail(staffProfile?.email || '');
    setFormErrors({});
    setIsEditing(false);
  };

  // Функция для открытия диалога выбора файла
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (isLoading && !staffProfile) {
    return (
      <div className="dh-pc-section dh-pc-personal-section">
        <div className="dh-pc-section-header">
          <h1 className="dh-pc-section-title">Личный кабинет</h1>
        </div>
        <div className="dh-pc-loading">
          <p>Загрузка данных профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dh-pc-section dh-pc-personal-section">
      <div className="dh-pc-section-header">
        <div className="dss-header-left">
          <h2 className="dss-title">Личный кабинет</h2>
          <p className="dss-subtitle">Просмотр персональных данных и сформированных документов</p>
        </div>
      </div>

      <div className="dh-pc-main-content">
        {/* ЛЕВАЯ КОЛОНКА — личные данные + кнопки снизу */}
        <div className="dh-pc-content-left">
          <div className="dh-pc-personal-content">
            <div className="dh-pc-profile-details">
              <div className="dh-pc-detail-group">
                <h3 className="dh-pc-detail-group-title">Личная информация</h3>
                <div className="dh-pc-detail-field">
                  <label>Фамилия</label>
                  <p className={isEditing ? 'dh-pc-field-non-editable' : ''}>
                    {userProfile.lastName}
                  </p>
                </div>

                <div className="dh-pc-detail-field">
                  <label>Имя</label>
                  <p className={isEditing ? 'dh-pc-field-non-editable' : ''}>
                    {userProfile.firstName}
                  </p>
                </div>

                <div className="dh-pc-detail-field">
                  <label>Отчество</label>
                  <p className={isEditing ? 'dh-pc-field-non-editable' : ''}>
                    {userProfile.patronymic}
                  </p>
                </div>

                {/* Редактируемое поле - Email */}
                <div className="dh-pc-detail-field">
                  <label>Email</label>
                  {isEditing ? (
                    <>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={handleEmailChange}
                        placeholder="Введите email"
                        className={`dh-pc-field-editable ${formErrors.email ? 'pc-error' : ''}`}
                        disabled={isLoading}
                      />
                      {formErrors.email && (
                        <span className="dh-pc-error-text">{formErrors.email}</span>
                      )}
                    </>
                  ) : (
                    <p>{userProfile.email}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* КНОПКИ — внизу левой колонки */}
          <div className="dh-pc-profile-footer">
            <div className="dh-pc-header-actions">
              {isEditing ? (
                <>
                  <button 
                    className="dh-pc-save-btn"
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                  <button 
                    className="dh-pc-cancel-btn"
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="dh-pc-edit-btn"
                    onClick={() => setIsEditing(true)}
                    disabled={isLoading}
                  >
                    Редактировать
                  </button>
                  <button 
                    className="dh-pc-password-btn"
                    onClick={() => setIsPasswordModalOpen(true)}
                    disabled={isLoading}
                  >
                    Сменить пароль
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА — документы */}
        <div className="dh-pc-content-right">
          <div className="dh-pc-documents-section">
            <div className="dh-pc-documents-header">
              <h3 className="dh-pc-documents-title">Документы</h3>
              <button 
                className="dh-pc-upload-doc-btn" 
                onClick={handleUploadClick}
                disabled={uploadingFile}
              >
                {uploadingFile ? 'Загрузка...' : 'Загрузить документ'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Таблица документов */}
            <div className="dh-pc-documents-table-container">
              {isLoadingDocuments ? (
                <div className="dh-pc-loading-documents">
                  <p>Загрузка документов...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="dh-pc-no-documents">
                  <p>Нет загруженных документов</p>
                  <p className="dh-pc-no-documents-hint">Нажмите "Загрузить документ", чтобы добавить файл</p>
                </div>
              ) : (
                <table className="dh-pc-documents-table">
                  <thead>
                    <tr>
                      <th style={{ width: '100px' }}>Название</th>
                      <th style={{ width: '50px' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td className="dh-pc-doc-name-cell">
                          <div className="dh-pc-doc-info">
                            <span className="dh-pc-doc-name" title={doc.name}>
                              {doc.name.length > 50 ? doc.name.substring(0, 47) + '...' : doc.name}
                            </span>
                          </div>
                        </td>
                        <td className="dh-pc-doc-actions-cell">
                          <div className="dh-pc-doc-actions">
                            <button 
                              className="dh-pc-doc-download" 
                              title="Скачать" 
                              onClick={() => handleDownloadDocument(doc)}
                            >
                              Скачать
                            </button>
                            <button 
                              className="dh-pc-doc-delete" 
                              title="Удалить" 
                              onClick={() => handleDeleteDocument(doc)}
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно смены пароля */}
      {isPasswordModalOpen && (
        <div className="dh-pc-modal-overlay" onClick={() => !isLoading && setIsPasswordModalOpen(false)}>
          <div className="dh-pc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dh-pc-modal-header">
              <h3 className="dh-pc-modal-title">Смена пароля</h3>
              <button 
                className="dh-pc-modal-close"
                onClick={() => !isLoading && setIsPasswordModalOpen(false)}
                disabled={isLoading}
              >
                ×
              </button>
            </div>

            <form className="dh-pc-password-form" onSubmit={handlePasswordSubmit}>
              <div className="dh-pc-form-field">
                <label htmlFor="currentPassword">Текущий пароль</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Введите текущий пароль"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="dh-pc-form-field">
                <label htmlFor="newPassword">Новый пароль</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Введите новый пароль (мин. 6 символов)"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>

              <div className="dh-pc-form-field">
                <label htmlFor="confirmPassword">Подтвердите новый пароль</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Повторите новый пароль"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="dh-pc-modal-actions">
                <button 
                  type="button"
                  className="dh-pc-btn-secondary"
                  onClick={() => !isLoading && setIsPasswordModalOpen(false)}
                  disabled={isLoading}
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="dh-pc-btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Смена пароля...' : 'Сменить пароль'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};