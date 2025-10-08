import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import './DocumentSectionStyle.css';

export interface Document {
  id: number;
  title: string;
  creationDate: string;
  type: string;
  data?: any;
}

export const DocumentsSection: React.FC = () => {
  const { user } = useUser();
  
  // Данные из БД через контекст пользователя
  const userData = {
    fullName: user ? `${user.lastName} ${user.name} ${user.surname}` : 'ФИО не указано',
    group: user?.numberGroup ? user.numberGroup.toString() : '2992',
    course: '4 курс',
    phone: '+7 (999) 999-99-99', // Это поле можно будет редактировать в форме
    departmentHead: 'Петрова Мария Сергеевна' // Это можно получать из API по группе
  };

  const subjects = ['Математика', 'Программирование', 'Базы данных', 'Веб-разработка'];
  const teachers = ['Смирнов А.Б.', 'Кузнецова В.С.', 'Попов Д.Е.'];
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const documentTypes = [
    'Все документы',
    'Заявление на отчисление по собственному желанию',
    'Заявление на отчисление в другое образовательное учреждение',
    'Заявление на пропуск занятий',
    'Объяснительная записка о причинах опоздания',
    'Объяснительная записка о причинах пропусков занятия'
  ];

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('Все документы');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Данные форм для каждого типа документа
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    institutionName: '',
    subject: '',
    teacher: '',
    month: '',
    hours: '',
    phone: userData.phone
  });

  // Загрузка документов пользователя из базы данных
  useEffect(() => {
    const fetchUserDocuments = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:8080/api/v1/documents/student/${user.id}`);
        
        if (response.ok) {
          const userDocuments = await response.json();
          setDocuments(userDocuments);
        } else {
          console.error('Ошибка при загрузке документов');
        }
      } catch (error) {
        console.error('Ошибка сети:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDocuments();
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const openModal = () => {
    if (selectedDocumentType !== 'Все документы') {
      setIsModalOpen(true);
      // Блокируем скролл body при открытии модального окна
      document.body.style.overflow = 'hidden';
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Восстанавливаем скролл body при закрытии модального окна
    document.body.style.overflow = 'auto';
    // Сброс формы при закрытии
    setFormData({
      startDate: '',
      endDate: '',
      reason: '',
      institutionName: '',
      subject: '',
      teacher: '',
      month: '',
      hours: '',
      phone: userData.phone
    });
  };

  const handleCreateDocument = async () => {
    if (!user) return;

    const today = new Date().toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit' 
    });

    const documentData = {
      studentId: user.id,
      title: selectedDocumentType,
      type: selectedDocumentType,
      creationDate: today,
      formData: { ...formData, userData }
    };

    try {
      const response = await fetch('http://localhost:8080/api/v1/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentData)
      });

      if (response.ok) {
        const newDocument = await response.json();
        setDocuments(prev => [...prev, newDocument]);
        closeModal();
      } else {
        alert('Ошибка при создании документа');
      }
    } catch (error) {
      console.error('Ошибка сети:', error);
      alert('Ошибка сети при создании документа');
    }
  };

  const handleDownloadDocument = async (documentId: number) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/documents/${documentId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `document_${documentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Ошибка при скачивании документа');
      }
    } catch (error) {
      console.error('Ошибка сети:', error);
      alert('Ошибка сети при скачивании документа');
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/api/v1/documents/${documentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      } else {
        alert('Ошибка при удалении документа');
      }
    } catch (error) {
      console.error('Ошибка сети:', error);
      alert('Ошибка сети при удалении документа');
    }
  };

  const renderModal = () => {
    if (!isModalOpen) return null;

    return (
      <div className="ds-modal-overlay" onClick={closeModal} >
        <div className="ds-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="ds-modal-header">
            <h3>Создание документа</h3>
            <button className="ds-modal-close" onClick={closeModal}>×</button>
          </div>

          <div className="ds-modal-content">
            <div className="ds-modal-type">
              <strong>Тип документа:</strong> {selectedDocumentType}
            </div>

            <div className="ds-form-sections">
              {/* Общая информация */}
              <div className="ds-form-section">
                <h4>Общая информация</h4>
                <div className="ds-form-grid">
                  <div className="ds-form-field">
                    <label>ФИО студента</label>
                    <input type="text" value={userData.fullName} disabled className="ds-input disabled" />
                  </div>
                  <div className="ds-form-field">
                    <label>Группа</label>
                    <input type="text" value={userData.group} disabled className="ds-input disabled" />
                  </div>
                  <div className="ds-form-field">
                    <label>Курс</label>
                    <input type="text" value={userData.course} disabled className="ds-input disabled" />
                  </div>
                </div>
              </div>

              {/* Специфичные поля для каждого типа документа */}
              {selectedDocumentType === 'Заявление на отчисление по собственному желанию' && (
                <div className="ds-form-section">
                  <h4>Данные для заявления</h4>
                  <div className="ds-form-grid">
                    <div className="ds-form-field">
                      <label>Телефон *</label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="ds-input"
                        placeholder="Введите номер телефона"
                        required
                      />
                    </div>
                    <div className="ds-form-field">
                      <label>Дата отчисления *</label>
                      <input 
                        type="date" 
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        className="ds-input"
                        required
                      />
                    </div>
                    <div className="ds-form-field">
                      <label>Заведующий отделением</label>
                      <input type="text" value={userData.departmentHead} disabled className="ds-input disabled" />
                    </div>
                  </div>
                </div>
              )}

              {selectedDocumentType === 'Заявление на отчисление в другое образовательное учреждение' && (
                <div className="ds-form-section">
                  <h4>Данные для заявления</h4>
                  <div className="ds-form-grid">
                    <div className="ds-form-field">
                      <label>Телефон *</label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="ds-input"
                        placeholder="Введите номер телефона"
                        required
                      />
                    </div>
                    <div className="ds-form-field">
                      <label>Дата отчисления *</label>
                      <input 
                        type="date" 
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        className="ds-input"
                        required
                      />
                    </div>
                    <div className="ds-form-field full-width">
                      <label>Название учебного учреждения *</label>
                      <input 
                        type="text" 
                        value={formData.institutionName}
                        onChange={(e) => handleInputChange('institutionName', e.target.value)}
                        className="ds-input"
                        placeholder="Введите название учреждения"
                        required
                      />
                    </div>
                    <div className="ds-form-field">
                      <label>Заведующий отделением</label>
                      <input type="text" value={userData.departmentHead} disabled className="ds-input disabled" />
                    </div>
                  </div>
                </div>
              )}

              {selectedDocumentType === 'Заявление на пропуск занятий' && (
                <div className="ds-form-section">
                  <h4>Данные для заявления</h4>
                  <div className="ds-form-grid">
                    <div className="ds-form-field">
                      <label>Пропуск с *</label>
                      <input 
                        type="date" 
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        className="ds-input"
                        required
                      />
                    </div>
                    <div className="ds-form-field">
                      <label>Пропуск по *</label>
                      <input 
                        type="date" 
                        value={formData.endDate}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                        className="ds-input"
                        required
                      />
                    </div>
                  </div>
                  <div className="ds-form-field full-width">
                    <label>Причина пропуска *</label>
                    <textarea 
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      className="ds-textarea"
                      placeholder="Укажите причину пропуска"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              )}

              {selectedDocumentType === 'Объяснительная записка о причинах опоздания' && (
                <div className="ds-form-section">
                  <h4>Данные для объяснительной</h4>
                  <div className="ds-form-grid">
                    <div className="ds-form-field">
                      <label>Предмет *</label>
                      <select 
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        className="ds-input"
                        required
                      >
                        <option value="">Выберите предмет</option>
                        {subjects.map((subject, index) => (
                          <option key={index} value={subject}>{subject}</option>
                        ))}
                      </select>
                    </div>
                    <div className="ds-form-field">
                      <label>Преподаватель *</label>
                      <select 
                        value={formData.teacher}
                        onChange={(e) => handleInputChange('teacher', e.target.value)}
                        className="ds-input"
                        required
                      >
                        <option value="">Выберите преподавателя</option>
                        {teachers.map((teacher, index) => (
                          <option key={index} value={teacher}>{teacher}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="ds-form-field full-width">
                    <label>Причина опоздания *</label>
                    <textarea 
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      className="ds-textarea"
                      placeholder="Укажите причину опоздания"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              )}

              {selectedDocumentType === 'Объяснительная записка о причинах пропусков занятия' && (
                <div className="ds-form-section">
                  <h4>Данные для объяснительной</h4>
                  <div className="ds-form-grid">
                    <div className="ds-form-field">
                      <label>Месяц *</label>
                      <select 
                        value={formData.month}
                        onChange={(e) => handleInputChange('month', e.target.value)}
                        className="ds-input"
                        required
                      >
                        <option value="">Выберите месяц</option>
                        {months.map((month, index) => (
                          <option key={index} value={month}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div className="ds-form-field">
                      <label>Количество часов *</label>
                      <input 
                        type="number" 
                        value={formData.hours}
                        onChange={(e) => handleInputChange('hours', e.target.value)}
                        className="ds-input"
                        placeholder="Введите количество часов"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  <div className="ds-form-field full-width">
                    <label>Причина пропуска *</label>
                    <textarea 
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      className="ds-textarea"
                      placeholder="Укажите причину пропуска занятий"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="ds-modal-footer">
              <button className="ds-cancel-btn" onClick={closeModal}>
                Отмена
              </button>
              <button className="ds-create-btn" onClick={handleCreateDocument}>
                Создать документ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredDocuments = selectedDocumentType === 'Все документы' 
    ? documents 
    : documents.filter(doc => doc.type === selectedDocumentType);

  if (isLoading) {
    return (
      <div className="document-section">
        <div className="ds-content">
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Загрузка документов...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="document-section">
      <div className="ds-header">
        <div className="ds-controls">
          <div className="ds-filter-section">
            <label htmlFor="document-type" className="ds-filter-label">Тип документа:</label>
            <select 
              id="document-type"
              value={selectedDocumentType}
              onChange={(e) => setSelectedDocumentType(e.target.value)}
              className="ds-select"
            >
              {documentTypes.map((type, index) => (
                <option key={index} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <button 
            className="ds-create-main-btn"
            onClick={openModal}
            disabled={selectedDocumentType === 'Все документы'}
          >
            Создать документ
          </button>
        </div>
      </div>

      <div className="ds-content">
        {filteredDocuments.length > 0 ? (
          <table className="ds-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Название документа</th>
                <th>Дата создания</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((document, index) => (
                <tr key={document.id}>
                  <td>{index + 1}.</td>
                  <td>{document.title}</td>
                  <td>{document.creationDate}</td>
                  <td>
                    <div className="ds-action-buttons">
                      <button 
                        className="ds-download-btn"
                        onClick={() => handleDownloadDocument(document.id)}
                      >
                        Скачать
                      </button>
                      <button 
                        className="ds-delete-btn"
                        onClick={() => handleDeleteDocument(document.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="ds-empty-state">
            <p>
              {selectedDocumentType === 'Все документы' 
                ? 'Нет доступных документов' 
                : `Нет документов типа "${selectedDocumentType}"`
              }
            </p>
          </div>
        )}
      </div>

      {renderModal()}
    </div>
  );
};