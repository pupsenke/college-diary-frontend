import React, { useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('Все документы');
  const [formData, setFormData] = useState<FormData>({
    startDate: '2025-10-15',
    endDate: '2025-10-20',
    phone: '+7 (999) 999-99-99',
    reason: '',
    institutionName: '',
    subject: '',
    teacher: '',
    month: '',
    hours: ''
  });

  // Данные пользователя
  const userData: UserData = {
    fullName: "Иванов Иван Иванович",
    group: "2992",
    course: "3",
    phone: "+7 (999) 999-99-99",
    departmentHead: "Петрова Мария Сергеевна",
  };

  // Типы документов
  const documentTypes = [
    'Все документы',
    'Заявление на отчисление по собственному желанию',
    'Заявление на отчисление в другое образовательное учреждение',
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

  // Пример списка документов
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      title: 'Заявление на отчисление',
      type: 'Заявление на отчисление по собственному желанию',
      creationDate: '2024-01-15'
    },
    {
      id: '2',
      title: 'Объяснительная по опозданию',
      type: 'Объяснительная записка о причинах опоздания',
      creationDate: '2024-01-10'
    }
  ]);

  // Функции для работы с модальным окном
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Обработчик изменения полей формы
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Форматирование даты для документа (день, месяц, год отдельно)
  const formatDateForDocument = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString();
    const month = date.toLocaleString('ru-RU', { month: 'long' });
    const year = date.getFullYear().toString();
    return { day, month, year };
  };

  // Форматирование даты для отображения
  const formatDateRus = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('ru-RU', { month: 'long' });
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
        title: fileName.replace('.docx', ''),
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
    // Форматируем даты для документа
    const dismissalDate = formatDateForDocument(formData.startDate);
    const currentDate = formatDateForDocument(new Date().toISOString().split('T')[0]);

    // Подготавливаем данные для шаблона
    const templateData = {
      // Основные данные
      fullName: userData.fullName,
      group: userData.group,
      phone: formData.phone || userData.phone,
      departmentHead: userData.departmentHead,
      
      // Дата отчисления (разбитая на части)
      dismissalDay: dismissalDate.day,
      dismissalMonth: dismissalDate.month,
      dismissalYear: dismissalDate.year,
      
      // Текущая дата (разбитая на части)
      currentDay: currentDate.day,
      currentMonth: currentDate.month,
      currentYear: currentDate.year,
      
      // Полные отформатированные даты
      dateOfDismissal: formatDateRus(formData.startDate),
      currentDate: formatDateRus(new Date().toISOString().split('T')[0]),
      
      // Дополнительные данные
      course: userData.course,
      institutionName: formData.institutionName,
      startDate: formatDateRus(formData.startDate),
      endDate: formatDateRus(formData.endDate),
      reason: formData.reason,
      subject: formData.subject,
      teacher: formData.teacher,
      month: formData.month,
      hours: formData.hours
    };

    let templateUrl = '';
    let fileName = '';

    switch (selectedDocumentType) {
      case 'Заявление на отчисление по собственному желанию':
        templateUrl = '/dismissal_template.docx';
        fileName = `Заявление_на_отчисление_${userData.fullName.replace(/\s+/g, '_')}.docx`;
        break;
      case 'Заявление на отчисление в другое образовательное учреждение':
        templateUrl = '/templates/transfer_template.docx';
        fileName = `Заявление_на_перевод_${userData.fullName.replace(/\s+/g, '_')}.docx`;
        break;
      case 'Заявление на пропуск занятий':
        templateUrl = '/templates/absence_template.docx';
        fileName = `Заявление_на_пропуск_${userData.fullName.replace(/\s+/g, '_')}.docx`;
        break;
      case 'Объяснительная записка о причинах опоздания':
        templateUrl = '/templates/late_explanation_template.docx';
        fileName = `Объяснительная_опоздание_${userData.fullName.replace(/\s+/g, '_')}.docx`;
        break;
      case 'Объяснительная записка о причинах пропусков занятия':
        templateUrl = '/templates/absence_explanation_template.docx';
        fileName = `Объяснительная_пропуск_${userData.fullName.replace(/\s+/g, '_')}.docx`;
        break;
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
    if (!isModalOpen) return null;

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

              {/* Специфичные поля для заявления на отчисление */}
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

              {/* Остальной код модального окна остается без изменений */}
              {/* ... */}
            </div>

            <div className="ds-modal-footer">
              <button className="ds-cancel-btn" onClick={closeModal} disabled={isLoading}>
                Отмена
              </button>
              <button 
                className="ds-create-btn" 
                onClick={handleCreateDocument}
                disabled={isLoading}
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

    //комент
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