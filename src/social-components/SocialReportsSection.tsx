import React, { useState, useMemo, useEffect, useCallback } from 'react';
import './SocialReportsSection.css';

interface ReportData {
  id: number;
  name: string;
  type: 'orphans' | 'disabled';
  date: string;
}

interface Certificate {
  fullInfo: string;
  image: string | null;
}

interface DisabledStudent {
  id: number;
  fullName: string;
  group: string;
  direction: string;
  certificate: Certificate;
  statusWithGroup: string;
  restrictions: string;
  birthDate: string;
  addressPhone: string;
  educationPayment: string;
}

interface OrphanStudent {
  id: number;
  fullName: string;
  group: string;
  direction: string;
  birthDate: string;
  parentsInfo: string;
  addressPhone: string;
  registrationAddress: string;
  guardian: string;
  educationPayment: string;
}

const REPORT_TYPES = [
  {
    key: 'orphans' as const,
    title: 'Дети-сироты',
    subtitle: 'и детях, оставшихся без попечения родителей',
    cardImg: '/social-icons/orphans_icon.svg',
    modalImg: '/social-icons/orphans_icon.svg',
  },
  {
    key: 'disabled' as const,
    title: 'Дети-инвалиды',
    subtitle: 'и лицах с ограниченными возможностями здоровья',
    cardImg: '/social-icons/disabled_icon.svg',
    modalImg: '/social-icons/disabled_icon.svg',
  }
];

const mockDisabledStudents: DisabledStudent[] = [
  {
    id: 1,
    fullName: 'Алисеевич Кирилл Александрович',
    group: '5922',
    direction: '15.02.16 Технология машиностроения',
    certificate: {
      fullInfo: 'Серия МСЭ-2015 №2431238 от 31.10.2017, Справка до 10.02.2027',
      image: null
    },
    statusWithGroup: 'ребенок-инвалид',
    restrictions: 'соматика (диабет)',
    birthDate: '10.02.2009',
    addressPhone: 'г. Великий Новгород, ул. Московкая, д.30, корп.1, кв.96 +7 (911) 607-10-30',
    educationPayment: 'очная, фед.бюджет'
  },
  {
    id: 2,
    fullName: 'Петрова Анна Сергеевна',
    group: '5820',
    direction: '09.02.07 Информационные системы',
    certificate: {
      fullInfo: 'Серия МСЭ-2018 №5678912 от 15.03.2020, Справка до 15.03.2028',
      image: null
    },
    statusWithGroup: 'инвалид, II группа',
    restrictions: 'нарушение слуха',
    birthDate: '25.07.2010',
    addressPhone: 'г. Великий Новгород, ул. Ленина, д.10, кв.5 +7 (911) 123-45-67',
    educationPayment: 'очная, обл.бюджет'
  }
];

const mockOrphanStudents: OrphanStudent[] = [
  {
    id: 1,
    fullName: 'Андреев Иван Игоревич',
    group: '5901',
    direction: '11.01.02 Радиомеханик',
    birthDate: '03.08.2009',
    parentsInfo: 'Умерли оба родителя',
    addressPhone: 'г. Великий Новгород, ул. Ворошилова, д.19, кв. 63 +7 (996) 067-98-99',
    registrationAddress: 'г. Великий Новгород, ул. Ворошилова, д.19, кв. 63 (временно рег. до 18 лет) пос. Пролетарий, ул. Октябрьская, д. 18 (пост. рег.)',
    guardian: 'Антонцева Светлана Сергеевна (бабушка)',
    educationPayment: 'очная, обл.бюджет'
  },
  {
    id: 2,
    fullName: 'Сидорова Екатерина Дмитриевна',
    group: '5821',
    direction: '38.02.01 Экономика',
    birthDate: '15.11.2010',
    parentsInfo: 'Отец: Сидоров Д.А. (лишен прав), Мать: Сидорова Е.В. (в розыске)',
    addressPhone: 'г. Великий Новгород, ул. Гагарина, д.5, кв.12 +7 (911) 234-56-78',
    registrationAddress: 'г. Великий Новгород, ул. Гагарина, д.5, кв.12',
    guardian: 'Сидорова М.И. (бабушка), тел: +7 (911) 345-67-89',
    educationPayment: 'очная, фед.бюджет'
  }
];

/* ===================================================================
   Вынесенные модальные компоненты (не пересоздаются при ререндере)
   =================================================================== */

interface StudentsModalProps {
  onClose: () => void;
  studentSearchTerm: string;
  setStudentSearchTerm: (v: string) => void;
  renderCell: (value: string, type: 'disabled' | 'orphan', id: number, field: string, placeholder?: string) => React.ReactNode;
}

interface DisabledStudentsModalProps extends StudentsModalProps {
  filteredDisabledStudents: DisabledStudent[];
  updateCertificateInfo: (studentId: number, value: string) => void;
  handleCertificateUpload: (studentId: number, file: File) => void;
  setPreviewImage: (img: string | null) => void;
}

const DisabledStudentsModal: React.FC<DisabledStudentsModalProps> = ({
  onClose,
  studentSearchTerm,
  setStudentSearchTerm,
  filteredDisabledStudents,
  renderCell,
  updateCertificateInfo,
  handleCertificateUpload,
  setPreviewImage,
}) => {
  return (
    <>
      <div className="reports-modal-overlay" onClick={onClose} />
      <div className="students-modal wide-modal">
        <div className="students-modal-header">
          <h3>Дети-инвалиды и лица с ОВЗ</h3>
          <button className="students-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-search-box">
          <input
            type="text"
            placeholder="Поиск по ФИО"
            value={studentSearchTerm}
            onChange={(e) => setStudentSearchTerm(e.target.value)}
            className="modal-search-input"
          />
          <div className="modal-search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="10" cy="10" r="7"/>
              <line x1="21" y1="21" x2="15" y2="15"/>
            </svg>
          </div>
          {studentSearchTerm && (
            <button className="modal-search-clear" onClick={() => setStudentSearchTerm('')}>✕</button>
          )}
        </div>

        <div className="students-modal-table-wrapper">
          <table className="students-table disabled-table">
            <thead>
              <tr>
                <th className="col-num-header">№</th>
                <th>ФИО</th>
                <th>Группа</th>
                <th>Направление/ специальность</th>
                <th>Справка</th>
                <th>Статус, группа инвалидности</th>
                <th>Вид ограничений (нозология)</th>
                <th>Дата рождения</th>
                <th>Адрес места жительства, телефон</th>
                <th>Форма обучения, бюджет/платно</th>
              </tr>
            </thead>
            <tbody>
              {filteredDisabledStudents.map((student, index) => (
                <tr key={student.id}>
                  <td className="col-num">{index + 1}</td>
                  <td>{renderCell(student.fullName, 'disabled', student.id, 'fullName')}</td>
                  <td>{renderCell(student.group, 'disabled', student.id, 'group')}</td>
                  <td>{renderCell(student.direction, 'disabled', student.id, 'direction')}</td>
                  <td className="certificate-cell">
                    <div className="certificate-info">
                      <div className="certificate-fields">
                        {renderCell(student.certificate.fullInfo, 'disabled', student.id, 'certificate', 'Серия, номер, дата, срок действия')}
                      </div>
                      <div className="certificate-image-section">
                        {student.certificate.image ? (
                          <div className="certificate-preview">
                            <img
                              src={student.certificate.image}
                              alt="Справка"
                              className="certificate-thumb"
                              onClick={() => setPreviewImage(student.certificate.image!)}
                              style={{ cursor: 'pointer' }}
                            />
                            <button
                              className="certificate-change-btn"
                              onClick={() => document.getElementById(`cert-input-${student.id}`)?.click()}
                            >
                              Изменить
                            </button>
                          </div>
                        ) : (
                          <button
                            className="certificate-upload-btn"
                            onClick={() => document.getElementById(`cert-input-${student.id}`)?.click()}
                          >
                            Прикрепить фото справки
                          </button>
                        )}
                        <input
                          id={`cert-input-${student.id}`}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleCertificateUpload(student.id, e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>{renderCell(student.statusWithGroup, 'disabled', student.id, 'statusWithGroup')}</td>
                  <td>{renderCell(student.restrictions, 'disabled', student.id, 'restrictions')}</td>
                  <td>{renderCell(student.birthDate, 'disabled', student.id, 'birthDate')}</td>
                  <td>{renderCell(student.addressPhone, 'disabled', student.id, 'addressPhone')}</td>
                  <td>{renderCell(student.educationPayment, 'disabled', student.id, 'educationPayment')}</td>
                </tr>
              ))}
              {filteredDisabledStudents.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty-row">Студенты не найдены</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

interface OrphanStudentsModalProps extends StudentsModalProps {
  filteredOrphanStudents: OrphanStudent[];
}

const OrphanStudentsModal: React.FC<OrphanStudentsModalProps> = ({
  onClose,
  studentSearchTerm,
  setStudentSearchTerm,
  filteredOrphanStudents,
  renderCell,
}) => {
  return (
    <>
      <div className="reports-modal-overlay" onClick={onClose} />
      <div className="students-modal wide-modal">
        <div className="students-modal-header">
          <h3>Дети-сироты и оставшиеся без попечения родителей</h3>
          <button className="students-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-search-box">
          <input
            type="text"
            placeholder="Поиск по ФИО"
            value={studentSearchTerm}
            onChange={(e) => setStudentSearchTerm(e.target.value)}
            className="modal-search-input"
          />
          <div className="modal-search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="10" cy="10" r="7"/>
              <line x1="21" y1="21" x2="15" y2="15"/>
            </svg>
          </div>
          {studentSearchTerm && (
            <button className="modal-search-clear" onClick={() => setStudentSearchTerm('')}>✕</button>
          )}
        </div>

        <div className="students-modal-table-wrapper">
          <table className="students-table orphan-table">
            <thead>
              <tr>
                <th className="col-num-header">№</th>
                <th>ФИО</th>
                <th>Группа</th>
                <th>Направление/ специальность</th>
                <th>Дата рождения</th>
                <th>Сведения о родителях</th>
                <th>Адрес места жительства, телефон</th>
                <th>Адрес регистрации</th>
                <th>Опекун</th>
                <th>Форма обучения, бюджет/платно</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrphanStudents.map((student, index) => (
                <tr key={student.id}>
                  <td className="col-num">{index + 1}</td>
                  <td>{renderCell(student.fullName, 'orphan', student.id, 'fullName')}</td>
                  <td>{renderCell(student.group, 'orphan', student.id, 'group')}</td>
                  <td>{renderCell(student.direction, 'orphan', student.id, 'direction')}</td>
                  <td>{renderCell(student.birthDate, 'orphan', student.id, 'birthDate')}</td>
                  <td>{renderCell(student.parentsInfo, 'orphan', student.id, 'parentsInfo')}</td>
                  <td>{renderCell(student.addressPhone, 'orphan', student.id, 'addressPhone')}</td>
                  <td>{renderCell(student.registrationAddress, 'orphan', student.id, 'registrationAddress')}</td>
                  <td>{renderCell(student.guardian, 'orphan', student.id, 'guardian')}</td>
                  <td>{renderCell(student.educationPayment, 'orphan', student.id, 'educationPayment')}</td>
                </tr>
              ))}
              {filteredOrphanStudents.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty-row">Студенты не найдены</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

interface ImagePreviewModalProps {
  previewImage: string;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ previewImage, onClose }) => (
  <>
    <div className="reports-modal-overlay" onClick={onClose} />
    <div className="image-preview-modal" onClick={(e) => e.stopPropagation()}>
      <button className="image-preview-close" onClick={onClose}>✕</button>
      <img src={previewImage} alt="Справка МСЭ" className="image-preview-full" />
    </div>
  </>
);

/* ===================================================================
   Основной компонент
   =================================================================== */

export const ReportsSection: React.FC = () => {
  const [reports, setReports] = useState<ReportData[]>([
    { id: 1, name: 'Информация о детях-сиротах', type: 'orphans', date: '17.09.2025' },
    { id: 2, name: 'Информация о лицах с инвалидностью', type: 'disabled', date: '07.10.2025' },
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [currentReportType, setCurrentReportType] = useState<'orphans' | 'disabled' | null>(null);

  const [disabledStudents, setDisabledStudents] = useState<DisabledStudent[]>(mockDisabledStudents);
  const [orphanStudents, setOrphanStudents] = useState<OrphanStudent[]>(mockOrphanStudents);

  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [editingValue, setEditingValue] = useState<string>('');
  const [editingInfo, setEditingInfo] = useState<{
    type: 'disabled' | 'orphan';
    id: number;
    field: string;
  } | null>(null);

  // === ПОИСК, ФИЛЬТР, СОРТИРОВКА ПО ОТЧЁТАМ ===
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'orphans' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(term));
    }

    if (typeFilter !== 'all') {
      result = result.filter(r => r.type === typeFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'date') {
        const parseDate = (d: string) => {
          const [day, month, year] = d.split('.');
          return new Date(`${year}-${month}-${day}`).getTime();
        };
        return sortOrder === 'asc' 
          ? parseDate(a.date) - parseDate(b.date)
          : parseDate(b.date) - parseDate(a.date);
      }
      return sortOrder === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    });

    return result;
  }, [reports, searchTerm, typeFilter, sortBy, sortOrder]);

  const filteredDisabledStudents = useMemo(() => {
    if (!studentSearchTerm) return disabledStudents;
    const term = studentSearchTerm.toLowerCase();
    return disabledStudents.filter(s => s.fullName.toLowerCase().includes(term));
  }, [disabledStudents, studentSearchTerm]);

  const filteredOrphanStudents = useMemo(() => {
    if (!studentSearchTerm) return orphanStudents;
    const term = studentSearchTerm.toLowerCase();
    return orphanStudents.filter(s => s.fullName.toLowerCase().includes(term));
  }, [orphanStudents, studentSearchTerm]);

  useEffect(() => {
    if (showCreateModal || showStudentsModal || previewImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCreateModal, showStudentsModal, previewImage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const openCreateModal = (type: 'orphans' | 'disabled') => {
    setShowCreateModal(true);
    setCurrentReportType(type);
  };

  const openStudentsModal = (type: 'orphans' | 'disabled') => {
    setCurrentReportType(type);
    setStudentSearchTerm('');
    setShowStudentsModal(true);
  };

  const handleCreateSubmit = () => {
    if (!currentReportType) return;

    const newReport: ReportData = {
      id: Date.now(),
      name: `Информация ${currentReportType === 'orphans' ? 'о детях-сиротах' : 'о лицах с инвалидностью'}`,
      type: currentReportType,
      date: new Date().toLocaleDateString('ru-RU'),
    };

    setReports(prev => [newReport, ...prev]);
    setShowCreateModal(false);
    setCurrentReportType(null);
  };

  const handleDownload = (reportId: number) => {
    console.log(`Скачивание отчета #${reportId} в формате Word`);
  };

  const startEditing = useCallback((type: 'disabled' | 'orphan', id: number, field: string, currentValue: string) => {
    setEditingInfo({ type, id, field });
    setEditingValue(currentValue);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingInfo) return;

    if (editingInfo.type === 'disabled') {
      setDisabledStudents(prev => prev.map(student =>
        student.id === editingInfo.id
          ? (editingInfo.field === 'certificate'
              ? { ...student, certificate: { ...student.certificate, fullInfo: editingValue } }
              : { ...student, [editingInfo.field]: editingValue })
          : student
      ));
    } else {
      setOrphanStudents(prev => prev.map(student =>
        student.id === editingInfo.id
          ? { ...student, [editingInfo.field]: editingValue }
          : student
      ));
    }
    setEditingInfo(null);
    setEditingValue('');
  }, [editingInfo, editingValue]);

  const cancelEdit = useCallback(() => {
    setEditingInfo(null);
    setEditingValue('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  const updateCertificateInfo = useCallback((studentId: number, value: string) => {
    setDisabledStudents(prev => prev.map(student =>
      student.id === studentId
        ? { ...student, certificate: { ...student.certificate, fullInfo: value } }
        : student
    ));
  }, []);

  const handleCertificateUpload = useCallback((studentId: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setDisabledStudents(prev => prev.map(student =>
        student.id === studentId
          ? { ...student, certificate: { ...student.certificate, image: e.target?.result as string } }
          : student
      ));
    };
    reader.readAsDataURL(file);
  }, []);

  const renderCell = useCallback((value: string, type: 'disabled' | 'orphan', id: number, field: string, placeholder?: string) => {
    const isEditing = editingInfo?.type === type && editingInfo?.id === id && editingInfo?.field === field;

    if (isEditing && field === 'certificate') {
      return (
        <textarea
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancelEdit();
            else if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              saveEdit();
            }
          }}
          className="edit-input certificate-textarea"
          placeholder={placeholder}
          autoFocus
          rows={2}
        />
      );
    }

    if (isEditing) {
      return (
        <input
          type="text"
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className="edit-input"
          placeholder={placeholder}
          autoFocus
        />
      );
    }

    return (
      <div className="cell-content" onClick={() => startEditing(type, id, field, value)}>
        {value || '—'}
      </div>
    );
  }, [editingInfo, editingValue, startEditing, saveEdit, cancelEdit, handleKeyDown]);

  const InfoIcon = () => (
    <div className="info-icon-btn" tabIndex={0}>
      <button className="header-btn" type="button">
        <span className="info-icon-text">i</span>
        <span>Информация</span>
      </button>
      <div className="info-tooltip small">
        <div className="info-tooltip-content">
          <div className="info-header">
            <div className="info-title">
              <h3>Отчеты</h3>
              <p>Здесь вы можете создавать и скачивать отчеты по социальной работе.</p>
            </div>
          </div>
          <div className="info-section">
            <h4>Основные возможности</h4>
            <div className="features-grid">
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Формирование отчетов по детям-сиротам и детям-инвалидам</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Просмотр и редактирование списков студентов</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const RefreshButton = () => (
    <button
      className={`header-btn pc-refresh-btn ${refreshing ? 'pc-refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <img
        src="/st-icons/upload_icon.svg"
        className={`pc-refresh-icon ${refreshing ? 'pc-refresh-spin' : ''}`}
        alt="Обновить"
      />
      <span>{refreshing ? 'Обновление...' : 'Обновить данные'}</span>
    </button>
  );

  return (
    <div className="reports-section">
      <div className="reports-cabinet-header">
        <InfoIcon />
        <div className="reports-header-actions">
          <RefreshButton />
        </div>
      </div>

      <div className="reports-stats-grid">
        {REPORT_TYPES.map(type => (
          <div key={type.key} className="reports-stat-card">
            <div className="reports-stat-icon">
              <img src={type.cardImg} alt={type.title} />
            </div>
            <div className="reports-stat-info">
              <h3>—</h3>
              <p>{type.title}</p>
            </div>
          </div>
        ))}
        <div className="reports-stat-card">
          <div className="reports-stat-icon">
            <img src="/social-icons/all_od_icon.svg" alt="Всего" />
          </div>
          <div className="reports-stat-info">
            <h3>—</h3>
            <p>Всего студентов</p>
          </div>
        </div>
      </div>

      <div className="reports-quick-create two-columns">
        {REPORT_TYPES.map(type => (
          <div key={type.key} className="report-type-card large">
            <div className="report-type-card-header">
              <div className="report-type-icon-wrap">
                <img src={type.cardImg} alt={type.title} className="report-type-img" />
              </div>
              <div className="report-type-titles">
                <h4>{type.title}</h4>
                <p>{type.subtitle}</p>
              </div>
            </div>
            <div className="report-type-card-body">
              <div className="report-type-actions">
                <button
                  className="reports-confirm-btn"
                  onClick={() => openCreateModal(type.key)}
                >
                  Сформировать отчёт
                </button>
                <button
                  className="reports-btn-text students-list-btn"
                  onClick={() => openStudentsModal(type.key)}
                >
                  Список студентов
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* === ПАНЕЛЬ ПОИСКА, ФИЛЬТРА И СОРТИРОВКИ === */}
      <div className="reports-control-panel">
        <div className="reports-controls-top-row">
          <div className="reports-search-box">
            <input
              type="text"
              placeholder="Поиск по названию или типу"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="reports-search-input"
            />
            <div className="reports-search-icon">
              <img src="/social-icons/search_icon.svg" alt="Поиск" />
            </div>
            {searchTerm && (
              <button className="reports-search-clear" onClick={() => setSearchTerm('')}>
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="reports-controls-middle-row">
          <div className="reports-filters-grid">
            <div className="reports-filter-group">
              <label className="reports-filter-label">Тип отчета</label>
              <select 
                className="reports-filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'orphans' | 'disabled')}
              >
                <option value="all">Все типы</option>
                <option value="orphans">Дети-сироты</option>
                <option value="disabled">Дети-инвалиды</option>
              </select>
            </div>
          </div>
        </div>

        <div className="reports-controls-bottom-row">
          <div className="reports-sort-controls">
            <div className="reports-sort-group">
              <label className="reports-sort-label">Сортировка:</label>
              <select 
                className="reports-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
              >
                <option value="date">По дате</option>
                <option value="name">По названию</option>
              </select>
              <button 
                className="reports-sort-order-btn"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
              >
                <img 
                  src={sortOrder === 'asc' ? "/social-icons/sort_asc_icon.svg" : "/social-icons/sort_desc_icon.svg"} 
                  alt="Сортировка"
                  className="reports-sort-order-icon"
                />
                <span>{sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="recent-reports-section">
        <div className="recent-reports-header">
          <h3>Недавние отчеты</h3>
          <div className="reports-count">
            <span>Показано: <strong>{filteredReports.length}</strong> из <strong>{reports.length}</strong></span>
          </div>
        </div>

        <div className="recent-reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th className="reports-number-column">№</th>
                <th className="reports-name-column">Название отчета</th>
                <th className="reports-type-column"></th>
                <th className="reports-date-column"></th>
                <th className="reports-actions-column"></th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report, index) => (
                  <tr key={report.id}>
                    <td className="reports-number-cell">{index + 1}</td>
                    <td className="reports-name-cell">{report.name}</td>
                    <td className="reports-type-cell">
                      <span className="reports-type-badge">
                        {report.type === 'orphans' ? 'Дети-сироты' : 'Дети-инвалиды'}
                      </span>
                    </td>
                    <td className="reports-date-cell">{report.date}</td>
                    <td className="reports-actions-cell">
                      <button
                        className="reports-action-btn word-btn"
                        onClick={() => handleDownload(report.id)}
                      >
                        Word
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-row">Отчеты не найдены</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно создания отчета */}
      {showCreateModal && (
        <>
          <div className="reports-modal-overlay" onClick={() => setShowCreateModal(false)} />
          <div className="reports-modal create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reports-modal-header">
              <div className="reports-modal-header-content">
                <div className="reports-modal-icon">
                  <img src={currentReportType === 'orphans' ? REPORT_TYPES[0].modalImg : REPORT_TYPES[1].modalImg} alt="" />
                </div>
                <div>
                  <h3>Создание нового отчета</h3>
                  <p className="reports-modal-subtitle">
                    {currentReportType === 'orphans' ? 'Дети-сироты' : 'Дети-инвалиды'}
                  </p>
                </div>
              </div>
              <button className="reports-modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="reports-modal-content">
              <div className="pc-form-group">
                <label>Название отчета</label>
                <input
                  type="text"
                  className="pc-input-enhanced"
                  placeholder="Введите название отчета"
                  value={`Информация ${currentReportType === 'orphans' ? 'о детях-сиротах' : 'о лицах с инвалидностью'}`}
                  readOnly
                />
              </div>
              <div className="pc-form-group">
                <label>Дата формирования</label>
                <div className="reports-format-static">
                  <span className="reports-format-badge">{new Date().toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
              <div className="pc-form-group">
                <label>Формат экспорта</label>
                <div className="reports-format-static">
                  <span className="reports-format-badge">Word (.docx)</span>
                </div>
              </div>
            </div>
            <div className="reports-modal-actions">
              <button className="reports-btn-secondary" onClick={() => setShowCreateModal(false)}>Отмена</button>
              <button className="reports-confirm-btn" onClick={handleCreateSubmit}>Сформировать отчет</button>
            </div>
          </div>
        </>
      )}

      {showStudentsModal && currentReportType === 'disabled' && (
        <DisabledStudentsModal
          onClose={() => setShowStudentsModal(false)}
          studentSearchTerm={studentSearchTerm}
          setStudentSearchTerm={setStudentSearchTerm}
          filteredDisabledStudents={filteredDisabledStudents}
          renderCell={renderCell}
          updateCertificateInfo={updateCertificateInfo}
          handleCertificateUpload={handleCertificateUpload}
          setPreviewImage={setPreviewImage}
        />
      )}
      {showStudentsModal && currentReportType === 'orphans' && (
        <OrphanStudentsModal
          onClose={() => setShowStudentsModal(false)}
          studentSearchTerm={studentSearchTerm}
          setStudentSearchTerm={setStudentSearchTerm}
          filteredOrphanStudents={filteredOrphanStudents}
          renderCell={renderCell}
        />
      )}
      {previewImage && (
        <ImagePreviewModal previewImage={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </div>
  );
};