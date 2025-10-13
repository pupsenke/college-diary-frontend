import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import './DocumentSectionStyle.css';

// Добавляем импорт для работы с docx
import { Document as DocxDocument, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

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
    phone: '+7 (999) 999-99-99',
    departmentHead: 'Петрова Мария Сергеевна'
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

  // Функция для форматирования даты
  const formatDateForDocument = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('ru-RU', { month: 'long' });
    const year = date.getFullYear().toString().slice(-2);
    return { day, month, year };
  };

  // Функция для генерации документа на отчисление в формате docx
  const generateDismissalDocument = async () => {
    const currentDate = new Date();
    const dismissalDate = new Date(formData.startDate);
    
    // Форматирование дат
    const currentDateFormatted = formatDateForDocument(currentDate.toISOString().split('T')[0]);
    const dismissalDateFormatted = formatDateForDocument(formData.startDate);

    // Создание документа docx
    const doc = new DocxDocument({
      sections: [{
        properties: {},
        children: [
          // Шапка документа
          new Paragraph({
            children: [
              new TextRun({ text: "Ректору НовГУ", break: 1 }),
              new TextRun({ text: "Ю. С. Боровикову", break: 1 }),
              new TextRun({ text: "От обучающегося", break: 1 }),
            ],
          }),
          
          // Таблица с данными студента
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "ФИО студента" })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: userData.fullName })],
                    width: { size: 70, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Группа" })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: userData.group })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Телефон" })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: formData.phone })],
                  }),
                ],
              }),
            ],
          }),

          // Пустые строки для форматирования
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),

          // Заголовок заявления
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "ЗАЯВЛЕНИЕ", bold: true, size: 24 }),
            ],
          }),

          // Текст заявления
          new Paragraph({
            children: [
              new TextRun({ 
                text: `Прошу отчислить меня из Политехнического колледжа по собственному желанию с «${dismissalDateFormatted.day}» ${dismissalDateFormatted.month} 20${dismissalDateFormatted.year} года.` 
              }),
            ],
          }),

          // Пустые строки
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),

          // Дата и подпись
          new Paragraph({
            children: [
              new TextRun({ text: `«${currentDateFormatted.day}» ${currentDateFormatted.month} 20${currentDateFormatted.year} года` }),
              new TextRun({ text: " ".repeat(30) }), // Отступ
              new TextRun({ text: "Подпись ___________________" }),
            ],
          }),

          // Пустые строки
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),

          // Согласование
          new Paragraph({
            children: [
              new TextRun({ text: "Согласовано:", break: 1 }),
              new TextRun({ text: "Заведующий отделением Политехнического колледжа НовГУ", break: 1 }),
              new TextRun({ text: "___________________ / " + userData.departmentHead, break: 1 }),
              new TextRun({ text: "Подпись                                  ФИО", break: 1 }),
            ],
          }),
        ],
      }],
    });

    // Генерация Blob и скачивание
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Заявление_на_отчисление_${userData.fullName.replace(/\s+/g, '_')}.docx`);
  };

  // Функция для генерации других типов документов
  const generateOtherDocument = async (type: string) => {
    let docContent: any[] = [];
    let fileName = '';

    switch (type) {
      case 'Заявление на отчисление в другое образовательное учреждение':
        const currentDate = new Date();
        const dismissalDate = new Date(formData.startDate);
        
        const currentDateFormatted = formatDateForDocument(currentDate.toISOString().split('T')[0]);
        const dismissalDateFormatted = formatDateForDocument(formData.startDate);

        docContent = [
          new Paragraph({ children: [new TextRun({ text: "Ректору НовГУ", break: 1 }) ]}),
          new Paragraph({ children: [new TextRun({ text: "Ю. С. Боровикову", break: 1 }) ]}),
          new Paragraph({ children: [new TextRun({ text: "От обучающегося", break: 1 }) ]}),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "ФИО студента" })] }),
                  new TableCell({ children: [new Paragraph({ text: userData.fullName })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Группа" })] }),
                  new TableCell({ children: [new Paragraph({ text: userData.group })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Телефон" })] }),
                  new TableCell({ children: [new Paragraph({ text: formData.phone })] }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "ЗАЯВЛЕНИЕ", bold: true, size: 24 })],
          }),

          new Paragraph({
            children: [
              new TextRun({ 
                text: `Прошу отчислить меня из Политехнического колледжа в связи с переводом в ${formData.institutionName} с «${dismissalDateFormatted.day}» ${dismissalDateFormatted.month} 20${dismissalDateFormatted.year} года.` 
              }),
            ],
          }),

          new Paragraph({ text: "" }), new Paragraph({ text: "" }),

          new Paragraph({
            children: [
              new TextRun({ text: `«${currentDateFormatted.day}» ${currentDateFormatted.month} 20${currentDateFormatted.year} года` }),
              new TextRun({ text: " ".repeat(30) }),
              new TextRun({ text: "Подпись ___________________" }),
            ],
          }),

          new Paragraph({ text: "" }), new Paragraph({ text: "" }),

          new Paragraph({
            children: [
              new TextRun({ text: "Согласовано:", break: 1 }),
              new TextRun({ text: "Заведующий отделением Политехнического колледжа НовГУ", break: 1 }),
              new TextRun({ text: "___________________ / " + userData.departmentHead, break: 1 }),
              new TextRun({ text: "Подпись                                  ФИО", break: 1 }),
            ],
          }),
        ];
        fileName = `Заявление_на_перевод_${userData.fullName.replace(/\s+/g, '_')}.docx`;
        break;

      // Добавьте другие case для остальных типов документов...
      
      default:
        // Простой документ по умолчанию
        docContent = [
          new Paragraph({
            children: [new TextRun({ text: `Документ: ${type}`, break: 1 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Студент: ${userData.fullName}`, break: 1 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Группа: ${userData.group}`, break: 1 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Дата создания: ${new Date().toLocaleDateString('ru-RU')}`, break: 1 })],
          }),
        ];
        fileName = `Документ_${userData.fullName.replace(/\s+/g, '_')}.docx`;
    }

    const doc = new DocxDocument({
      sections: [{
        properties: {},
        children: docContent,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName);
  };

  // Функция для скачивания существующего документа
  const downloadExistingDocument = async (document: Document) => {
    // Для существующих документов создаем простую версию
    const doc = new DocxDocument({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: `Документ: ${document.title}`, break: 1 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Студент: ${userData.fullName}`, break: 1 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Группа: ${userData.group}`, break: 1 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Дата создания: ${document.creationDate}`, break: 1 })],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Документ_${document.id}_${userData.fullName.replace(/\s+/g, '_')}.docx`);
  };

  // Загрузка документов пользователя (моковые данные)
  useEffect(() => {
    const mockDocuments: Document[] = [
      {
        id: 1,
        title: 'Заявление на отчисление по собственному желанию',
        creationDate: '15.12.2024',
        type: 'Заявление на отчисление по собственному желанию'
      },
      {
        id: 2,
        title: 'Объяснительная записка о причинах опоздания',
        creationDate: '10.12.2024',
        type: 'Объяснительная записка о причинах опоздания'
      }
    ];

    setDocuments(mockDocuments);
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const openModal = () => {
    if (selectedDocumentType !== 'Все документы') {
      setIsModalOpen(true);
      document.body.style.overflow = 'hidden';
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = 'auto';
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

    setIsLoading(true);

    try {
      // Валидация для заявления на отчисление
      if (selectedDocumentType === 'Заявление на отчисление по собственному желанию') {
        if (!formData.phone || !formData.startDate) {
          alert('Пожалуйста, заполните все обязательные поля (отмечены *)');
          return;
        }

        // Генерация и скачивание документа
        await generateDismissalDocument();

        // Добавляем документ в локальный список
        const newDocument: Document = {
          id: Date.now(),
          title: selectedDocumentType,
          creationDate: new Date().toLocaleDateString('ru-RU'),
          type: selectedDocumentType
        };

        setDocuments(prev => [...prev, newDocument]);
      } 
      // Обработка других типов документов
      else {
        await generateOtherDocument(selectedDocumentType);

        const newDocument: Document = {
          id: Date.now(),
          title: selectedDocumentType,
          creationDate: new Date().toLocaleDateString('ru-RU'),
          type: selectedDocumentType
        };

        setDocuments(prev => [...prev, newDocument]);
      }

      closeModal();
    } catch (error) {
      console.error('Ошибка при создании документа:', error);
      alert('Произошла ошибка при создании документа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadDocument = async (documentId: number) => {
    const document = documents.find(doc => doc.id === documentId);
    if (document) {
      await downloadExistingDocument(document);
    }
  };

  const handleDeleteDocument = (documentId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

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