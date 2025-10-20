import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { apiService } from '../services/apiService';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import "./DocumentSectionStyle.css"

interface Document {
  id: string;
  title: string;
  type: string;
  creationDate: string;
}

interface UserData {
  fullName: string;
  group: string;
  course: string;
  phone: string;
  departmentHead: string;
}

interface FormData {
  documentTitle: string;
  startDate: string;
  endDate: string;
  phone: string;
  reason: string;
  institutionName: string;
  subject: string;
  teacher: string;
  month: string;
  hours: string;
}

export const DocumentsSection: React.FC = () => {
  const { user, isStudent } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('Все документы');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [groupData, setGroupData] = useState<any>(null);
  
  const [formData, setFormData] = useState<FormData>({
    documentTitle: '',
    startDate: '',
    endDate: '',
    phone: '',
    reason: '',
    institutionName: '',
    subject: '',
    teacher: '',
    month: '',
    hours: ''
  });

  // Типы документов
  const documentTypes = [
    'Все документы',
    'Заявление на отчисление по собственному желанию',
    'Заявление на отчисление в связи с переводом',
    'Заявление на пропуск занятий',
    'Объяснительная записка о причинах опоздания',
    'Объяснительная записка о причинах пропусков занятия'
  ];

  // Пример данных для выпадающих списков
  const subjects = ['Математика', 'Физика', 'Химия', 'Информатика', 'История'];
  const teachers = ['Иванов А.А.', 'Петрова Б.Б.', 'Сидоров В.В.', 'Кузнецова Г.Г.'];
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // Пустой список документов
  const [documents, setDocuments] = useState<Document[]>([]);

  // Загрузка данных пользователя и группы
  useEffect(() => {
    const loadUserData = async () => {
      if (!user || !isStudent) return;

      try {
        // Приводим тип к Student для доступа к студенческим полям
        const student = user as any;
        
        // Загружаем данные группы
        const groupData = await apiService.getGroupData(student.idGroup);
        setGroupData(groupData);

        // Формируем данные пользователя
        const userPhone = student.telephone || '';
        
        const userData: UserData = {
          fullName: `${student.lastName} ${student.name} ${student.patronymic}`,
          group: student.numberGroup.toString(),
          course: `${groupData.course} курс`,
          phone: userPhone,
          departmentHead: 'Петрова Мария Сергеевна'
        };

        setUserData(userData);
        
        // Устанавливаем телефон из БД в форму, если он есть
        if (userPhone) {
          setFormData(prev => ({
            ...prev,
            phone: userPhone
          }));
        }

      } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
        // Устанавливаем данные по умолчанию в случае ошибки
        const student = user as any;
        setUserData({
          fullName: `${student.lastName} ${student.name} ${student.patronymic}`,
          group: student.numberGroup?.toString() || 'Неизвестно',
          course: 'Неизвестно',
          phone: student.telephone || '',
          departmentHead: 'Петрова Мария Сергеевна'
        });
      }
    };

    loadUserData();
  }, [user, isStudent]);

  // Если пользователь не студент, показываем сообщение
  if (!isStudent) {
    return (
      <div className="document-section">
        <div className="ds-content">
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Раздел документов доступен только для студентов
          </div>
        </div>
      </div>
    );
  }

  // Функции для работы с модальным окном
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    // Сбрасываем форму
    setFormData({
      documentTitle: '',
      startDate: '',
      endDate: '',
      phone: userData?.phone || '',
      reason: '',
      institutionName: '',
      subject: '',
      teacher: '',
      month: '',
      hours: ''
    });
  };

  // Обработчик изменения полей формы
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Функция для получения названия месяца по номеру
  const getMonthName = (monthNumber: number) => {
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return months[monthNumber - 1];
  };

  // Форматирование даты для документа (день, месяц, год отдельно)
  const formatDateForDocument = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = getMonthName(date.getMonth() + 1);
    const year = date.getFullYear().toString().slice(-2);
    return { day, month, year };
  };

  // Форматирование даты для отображения в тексте
  const formatDateForText = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = getMonthName(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day} ${month} ${year} года`;
  };

  // Основная функция для генерации docx
  const generateDocxFromTemplate = async (
    templateUrl: string,
    data: any,
    fileName: string
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error('Ошибка загрузки шаблона ' + response.statusText);
      
      const arrayBuffer = await response.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      
      // Пробуем разные варианты разделителей
      let doc;
      let renderSuccess = false;

      // Вариант 1: Двойные фигурные скобки {{ }}
      try {
        doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: {
            start: '{{',
            end: '}}'
          }
        });
        doc.setData(data);
        doc.render();
        renderSuccess = true;
      } catch (error) {
        console.log('Вариант с {{ }} не сработал, пробуем с { }');
      }

      // Вариант 2: Одинарные фигурные скобки { }
      if (!renderSuccess) {
        try {
          doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: {
              start: '{',
              end: '}'
            }
          });
          doc.setData(data);
          doc.render();
          renderSuccess = true;
        } catch (error) {
          console.log('Вариант с { } не сработал');
          throw new Error('Не удалось отрендерить шаблон. Проверьте синтаксис тегов в документе.');
        }
      }

      if (!doc || !renderSuccess) {
        throw new Error('Не удалось инициализировать документ');
      }

      const blob = doc.getZip().generate({ 
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
      saveAs(blob, fileName);
      
      // Добавляем созданный документ в список
      const newDocument: Document = {
        id: Date.now().toString(),
        title: formData.documentTitle || fileName.replace('.docx', ''),
        type: selectedDocumentType,
        creationDate: new Date().toISOString().split('T')[0]
      };
      
      setDocuments(prev => [...prev, newDocument]);
      closeModal();
    } catch (error) {
      console.error('Ошибка генерации документа:', error);
      alert('Не удалось создать документ: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик создания документа
  const handleCreateDocument = () => {
    if (!userData) {
      alert('Данные пользователя не загружены');
      return;
    }

    // Проверка обязательных полей
    if (!formData.documentTitle.trim()) {
      alert('Пожалуйста, введите название документа');
      return;
    }

    if (!formData.phone.trim()) {
      alert('Пожалуйста, введите номер телефона');
      return;
    }

    // Проверка специфичных полей для каждого типа документа
    let templateUrl = '';
    let fileName = '';
    let templateData = {};

    const currentDate = formatDateForDocument(new Date().toISOString().split('T')[0]);

    switch (selectedDocumentType) {
      case 'Заявление на отчисление по собственному желанию':
        if (!formData.startDate) {
          alert('Пожалуйста, выберите дату отчисления');
          return;
        }
        const dismissalDate1 = formatDateForDocument(formData.startDate);
        templateUrl = '/voluntary_deduction.docx';
        fileName = `${formData.documentTitle.replace(/\s+/g, '_')}.docx`;
        templateData = {
          fullName: userData.fullName,
          group: userData.group,
          phone: formData.phone,
          departmentHead: userData.departmentHead,
          dismissalDay: dismissalDate1.day,
          dismissalMonth: dismissalDate1.month,
          dismissalYear: dismissalDate1.year,
          currentDay: currentDate.day,
          currentMonth: currentDate.month,
          currentYear: currentDate.year
        };
        break;

      case 'Заявление на отчисление в связи с переводом':
        if (!formData.startDate || !formData.institutionName.trim()) {
          alert('Пожалуйста, заполните дату отчисления и название учебного заведения');
          return;
        }
        const dismissalDate2 = formatDateForDocument(formData.startDate);
        templateUrl = '/transfer_dismissal_template.docx';
        fileName = `${formData.documentTitle.replace(/\s+/g, '_')}.docx`;
        templateData = {
          fullName: userData.fullName,
          group: userData.group,
          phone: formData.phone,
          institutionName: formData.institutionName,
          departmentHead: userData.departmentHead,
          dismissalDay: dismissalDate2.day,
          dismissalMonth: dismissalDate2.month,
          dismissalYear: dismissalDate2.year,
          currentDay: currentDate.day,
          currentMonth: currentDate.month,
          currentYear: currentDate.year
        };
        break;

      case 'Заявление на пропуск занятий':
        if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
          alert('Пожалуйста, заполните даты пропуска и причину');
          return;
        }
        const startDate = formatDateForText(formData.startDate);
        const endDate = formatDateForText(formData.endDate);
        templateUrl = '/absence_template.docx';
        fileName = `${formData.documentTitle.replace(/\s+/g, '_')}.docx`;
        templateData = {
          fullName: userData.fullName,
          group: userData.group,
          course: userData.course,
          dateStart: startDate,
          dateEnd: endDate,
          reason: formData.reason,
          currentDay: currentDate.day,
          currentMonth: currentDate.month,
          currentYear: currentDate.year
        };
        break;

      case 'Объяснительная записка о причинах опоздания':
        if (!formData.subject || !formData.teacher || !formData.reason.trim()) {
          alert('Пожалуйста, заполните все обязательные поля');
          return;
        }
        // Добавьте логику для этого типа документа
        alert('Функция создания объяснительной записки будет добавлена позже');
        return;

      case 'Объяснительная записка о причинах пропусков занятия':
        if (!formData.month || !formData.hours || !formData.reason.trim()) {
          alert('Пожалуйста, заполните все обязательные поля');
          return;
        }
        // Добавьте логику для этого типа документа
        alert('Функция создания объяснительной записки будет добавлена позже');
        return;

      default:
        alert('Неизвестный тип документа');
        return;
    }

    generateDocxFromTemplate(templateUrl, templateData, fileName);
  };

  // Обработчики для кнопок действий
  const handleDownloadDocument = (id: string) => {
    const document = documents.find(doc => doc.id === id);
    if (document) {
      alert(`Скачивание документа: ${document.title}`);
      // Здесь можно добавить логику скачивания
    }
  };

  const handleDeleteDocument = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот документ?')) {
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    }
  };

  // Рендер модального окна
  const renderModal = () => {
    if (!isModalOpen || !userData) return null;

    return (
      <div className="ds-modal-overlay" onClick={closeModal}>
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
                    <label>Название документа *</label>
                    <input 
                      type="text" 
                      value={formData.documentTitle}
                      onChange={(e) => handleInputChange('documentTitle', e.target.value)}
                      className="ds-input"
                      placeholder="Введите название документа"
                      required
                    />
                  </div>
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

              {/* Телефон - обязательное поле */}
              <div className="ds-form-section">
                <h4>Контактные данные</h4>
                <div className="ds-form-grid">
                  <div className="ds-form-field full-width">
                    <label>Телефон * {!userData.phone && <span style={{color: 'red'}}>(не указан в профиле)</span>}</label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="ds-input"
                      placeholder="Введите номер телефона"
                      required
                    />
                    {!userData.phone && (
                      <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                        Телефон не указан в вашем профиле. Пожалуйста, введите его для создания документа.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Специфичные поля для заявления на отчисление по собственному желанию */}
              {selectedDocumentType === 'Заявление на отчисление по собственному желанию' && (
                <div className="ds-form-section">
                  <h4>Данные для заявления</h4>
                  <div className="ds-form-grid">
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

              {/* Специфичные поля для заявления на отчисление в связи с переводом */}
              {selectedDocumentType === 'Заявление на отчисление в связи с переводом' && (
                <div className="ds-form-section">
                  <h4>Данные для заявления</h4>
                  <div className="ds-form-grid">
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
                      <label>Название учебного заведения *</label>
                      <input 
                        type="text" 
                        value={formData.institutionName}
                        onChange={(e) => handleInputChange('institutionName', e.target.value)}
                        className="ds-input"
                        placeholder="Введите полное название учебного заведения"
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

              {/* Специфичные поля для заявления на пропуск занятий */}
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
                      placeholder="Укажите причину пропуска занятий"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Добавьте остальные типы документов аналогично */}
            </div>

            <div className="ds-modal-footer">
              <button className="ds-cancel-btn" onClick={closeModal} disabled={isLoading}>
                Отмена
              </button>
              <button 
                className="ds-create-btn" 
                onClick={handleCreateDocument}
                disabled={isLoading || !formData.phone.trim() || !formData.documentTitle.trim()}
              >
                {isLoading ? 'Создание...' : 'Создать документ'}
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

  if (!userData) {
    return (
      <div className="document-section">
        <div className="ds-content">
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Загрузка данных...
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
                <th>Тип</th>
                <th>Дата создания</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((document, index) => (
                <tr key={document.id}>
                  <td>{index + 1}.</td>
                  <td>{document.title}</td>
                  <td>{document.type}</td>
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
                ? 'У вас пока нет созданных документов' 
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