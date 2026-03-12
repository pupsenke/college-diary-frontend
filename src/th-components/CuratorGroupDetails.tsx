import React, { useState } from 'react';
import './CuratorGroupDetails.css';

interface Student {
  id: number;
  name: string;
  attendance: number;
  math: number;
  programming: number;
  databases: number;
  average: number;
  status: string;
  category?: string;
  childrenBirthYears?: string;
  address?: string;
  education?: string;
  phone?: string;
  email?: string;
}

interface Group {
  id: number;
  number: string;
  specialty: string;
  course: number;
  studentsCount: number;
  averageAttendance: number;
  averageGrade: number;
  monitor: {
    name: string;
    appointedDate: string;
    phone: string;
    email: string;
  };
  students: Student[];
  socialPortrait: {
    category: string;
    students: {
      id: number;
      name: string;
    }[];
  }[];
}

interface CuratorGroupDetailsProps {
  group: Group;
  onBack: () => void;
  onChangeMonitor: (newMonitorName: string) => void;
  onOpenSocialModal: (student: Student) => void;
}

export const CuratorGroupDetails: React.FC<CuratorGroupDetailsProps> = ({
  group,
  onBack,
  onChangeMonitor,
  onOpenSocialModal
}) => {
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showSocialPortraitModal, setShowSocialPortraitModal] = useState(false);
  const [selectedStudentForSocial, setSelectedStudentForSocial] = useState<Student | null>(null);
  const [monitorSearchTerm, setMonitorSearchTerm] = useState('');
  const [socialPortraitCurrentStep, setSocialPortraitCurrentStep] = useState(1);
  const [categorySearchTerms, setCategorySearchTerms] = useState<Record<number, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  
  const [socialPortraitData, setSocialPortraitData] = useState<{
    categories: {
      id: number;
      name: string;
      icon: string;
      description: string;
      selected: boolean;
      students: {
        id: number;
        name: string;
        selected: boolean;
      }[];
    }[];
    notes: string;
    supportNeeded: string[];
    riskFactors: string;
  }>({
    categories: [
      {
        id: 1,
        name: 'Дети-сироты',
        icon: 'fas fa-home',
        description: 'Дети, оставшиеся без попечения родителей',
        selected: group.socialPortrait.some(c => c.category === 'Дети-сироты'),
        students: group.students.map(s => ({
          id: s.id,
          name: s.name,
          selected: group.socialPortrait.some(c => 
            c.category === 'Дети-сироты' && c.students.some(st => st.id === s.id)
          )
        }))
      },
      {
        id: 2,
        name: 'Студенты с ОВЗ',
        icon: 'fas fa-wheelchair',
        description: 'Студенты с ограниченными возможностями здоровья',
        selected: group.socialPortrait.some(c => c.category === 'Студенты с ОВЗ'),
        students: group.students.map(s => ({
          id: s.id,
          name: s.name,
          selected: group.socialPortrait.some(c => 
            c.category === 'Студенты с ОВЗ' && c.students.some(st => st.id === s.id)
          )
        }))
      },
      {
        id: 3,
        name: 'Из многодетных семей',
        icon: 'fas fa-users',
        description: 'Воспитываются в семьях с 3 и более детьми',
        selected: group.socialPortrait.some(c => c.category === 'Из многодетных семей'),
        students: group.students.map(s => ({
          id: s.id,
          name: s.name,
          selected: group.socialPortrait.some(c => 
            c.category === 'Из многодетных семей' && c.students.some(st => st.id === s.id)
          )
        }))
      },
      {
        id: 4,
        name: 'Малообеспеченные семьи',
        icon: 'fas fa-hand-holding-heart',
        description: 'Семьи с доходом ниже прожиточного минимума',
        selected: group.socialPortrait.some(c => c.category === 'Малообеспеченные семьи'),
        students: group.students.map(s => ({
          id: s.id,
          name: s.name,
          selected: group.socialPortrait.some(c => 
            c.category === 'Малообеспеченные семьи' && c.students.some(st => st.id === s.id)
          )
        }))
      },
      {
        id: 5,
        name: 'Иностранные студенты',
        icon: 'fas fa-globe',
        description: 'Граждане других государств',
        selected: group.socialPortrait.some(c => c.category === 'Иностранные студенты'),
        students: group.students.map(s => ({
          id: s.id,
          name: s.name,
          selected: group.socialPortrait.some(c => 
            c.category === 'Иностранные студенты' && c.students.some(st => st.id === s.id)
          )
        }))
      }
    ],
    notes: '',
    supportNeeded: [],
    riskFactors: ''
  });

  const [socialFormData, setSocialFormData] = useState({
    category: '',
    childrenBirthYears: '',
    address: '',
    education: ''
  });

  const handleOpenSocialModal = (student: Student) => {
    setSelectedStudentForSocial(student);
    setSocialFormData({
      category: student.category || '',
      childrenBirthYears: student.childrenBirthYears || '',
      address: student.address || '',
      education: student.education || ''
    });
    setShowSocialModal(true);
  };

  const handleSaveSocialData = () => {
    if (selectedStudentForSocial) {
      onOpenSocialModal({
        ...selectedStudentForSocial,
        category: socialFormData.category,
        childrenBirthYears: socialFormData.childrenBirthYears,
        address: socialFormData.address,
        education: socialFormData.education
      });
      setShowSocialModal(false);
    }
  };

  const handleCopyCategoryList = (categoryName: string) => {
    const category = group.socialPortrait.find(c => c.category === categoryName);
    if (category && category.students.length > 0) {
      const listText = `${categoryName} из ${group.number}:\n${category.students.map(s => s.name).join('\n')}`;
      navigator.clipboard.writeText(listText);
    }
  };

  const getFilteredStudents = (categoryId: number, students: { id: number; name: string; selected: boolean }[]) => {
    const searchTerm = categorySearchTerms[categoryId] || '';
    if (!searchTerm) return students;
    return students.filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getAttendanceColor = (attendance: number): string => {
    if (attendance >= 90) return '#2cbb00';
    if (attendance >= 75) return '#a5db28';
    if (attendance >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getGradeColor = (grade: number): string => {
    if (grade >= 4.5) return '#2cbb00';
    if (grade >= 3.5) return '#a5db28';
    if (grade >= 2.5) return '#f59e0b';
    return '#ef4444';
  };

  const currentCategoryId = socialPortraitData.categories.filter(c => c.selected)[currentCategoryIndex]?.id || 0;

  const filteredMonitorStudents = [...group.students]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(student => student.name.toLowerCase().includes(monitorSearchTerm.toLowerCase()));

  const sortedStudents = [...group.students].sort((a, b) => a.name.localeCompare(b.name));

  const handleNextStep = () => {
    if (socialPortraitCurrentStep < 2) {
      if (socialPortraitCurrentStep === 1) {
        const selectedCategories = socialPortraitData.categories.filter(c => c.selected);
        if (selectedCategories.length === 0) {
          alert('Пожалуйста, выберите хотя бы одну категорию');
          return;
        }
      }
      setSocialPortraitCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (socialPortraitCurrentStep > 1) {
      setSocialPortraitCurrentStep(prev => prev - 1);
    }
  };

  const handleSaveSocialPortrait = () => {
    setShowSocialPortraitModal(false);
    alert('Социальный портрет сохранен');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      console.log('Данные группы обновлены');
    }, 1000);
  };

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
              <h3>Информация о группе</h3>
              <p>Здесь отображается детальная информация о кураторской группе</p>
            </div>
          </div>
          
          <div className="info-section">
            <h4>Основные возможности</h4>
            <div className="features-grid">
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Просмотр списка студентов в алфавитном порядке</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Смена старосты группы</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Заполнение социальных данных студентов</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Управление социальным портретом группы</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h4>Как использовать</h4>
            <div className="usage-steps">
              <div className="steps">
                <span className="steps-number">1</span>
                <span>Для смены старосты нажмите на его ФИО в блоке с номером телефона и email</span>
              </div>
              <div className="steps">
                <span className="steps-number">2</span>
                <span>Для заполнения социальных данных нажмите кнопку с карандашом</span>
              </div>
              <div className="steps">
                <span className="steps-number">3</span>
                <span>Для управления социальным портретом нажмите "Заполнить данные"</span>
              </div>
              <div className="steps">
                <span className="steps-number">4</span>
                <span>Нажмите "Обновить данные группы" для получения актуальной информации</span>
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
    <div className="curator-details-page">
      <div className="attendance-cabinet-header">
        <div className="header-left-actions">
          <button className="backs-button" onClick={onBack}>
            <img src="/th-icons/arrow_icon.svg" alt="Назад" />
          </button>
          <InfoIcon />
        </div>
        <RefreshButton />
      </div>

      <div className="curator-details-monitor-section">
        <div className="curator-details-monitor-info">
          <div 
            className="curator-details-monitor-name clickable" 
            onClick={() => setShowMonitorModal(true)}
            title="Нажмите для смены старосты"
          >
            {group.monitor.name}
          </div>
          <div className="curator-details-monitor-meta">
            <span className="meta-phone">
              <span className="meta-label">Тел.:</span> {group.monitor.phone}
            </span>
            <span className="meta-email">
              <span className="meta-label">Email:</span> {group.monitor.email}
            </span>
          </div>
        </div>
      </div>

      <div className="curator-details-students-section">
        <h3>
          <img src="/social-icons/students_icon.svg" alt="Студенты" className="section-icon" />
          Список студентов {group.number}
        </h3>

        <div className="curator-details-table-container">
          <table className="curator-details-table">
            <thead>
              <tr>
                <th className="curator-details-col-number">№</th>
                <th className="curator-details-col-name">ФИО</th>
                <th className="curator-details-col-attendance">Посещаемость</th>
                <th className="curator-details-col-average">Успеваемость</th>
                <th className="curator-details-col-actions">Информация</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student, index) => (
                <tr 
                  key={student.id}
                  className={group.monitor.name === student.name ? 'current-monitor' : ''}
                >
                  <td className="curator-details-col-number">{index + 1}</td>
                  <td className="curator-details-col-name">{student.name}</td>
                  <td className="curator-details-col-attendance">
                    <span 
                      className="curator-details-attendance-badge"
                      style={{ backgroundColor: getAttendanceColor(student.attendance) }}
                    >
                      {student.attendance}%
                    </span>
                  </td>
                  <td className="curator-details-col-average">
                    <span 
                      className="curator-details-grade-badge"
                      style={{ backgroundColor: getGradeColor(student.average) }}
                    >
                      {student.average.toFixed(1)}
                    </span>
                  </td>
                  <td className="curator-details-col-actions">
                    <button 
                      className="curator-details-action-btn"
                      onClick={() => handleOpenSocialModal(student)}
                      title="Заполнить социальные данные"
                    >
                      <img src="/th-icons/edit_icon.svg" alt="Заполнить" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="curator-details-social-section">
        <div className="social-section-header">
          <h3>
            <img src="/social-icons/categories_icon.svg" alt="Социальный портрет" className="section-icon" />
            Социальный портрет группы
          </h3>
          <button 
            className="curator-details-social-edit-btn"
            onClick={() => setShowSocialPortraitModal(true)}
          >
            Заполнить данные
          </button>
        </div>

        <div className="curator-details-social-grid">
          {group.socialPortrait.map((item, index) => (
            <div key={index} className="curator-details-social-card">
              <div className="curator-details-social-header">
                <h4>{item.category}</h4>
                <span className="curator-details-social-count">{item.students.length}</span>
              </div>
              <ul className="curator-details-social-list">
                {item.students.map((student, i) => (
                  <li key={i}>{student.name}</li>
                ))}
              </ul>
              {item.students.length > 0 && (
                <button 
                  className="curator-details-social-copy-btn"
                  onClick={() => handleCopyCategoryList(item.category)}
                  title="Скопировать список"
                >
                  <i className="fas fa-copy"></i>
                  Скопировать список
                </button>
              )}
            </div>
          ))}
          {group.socialPortrait.length === 0 && (
            <div className="curator-details-social-empty">
              <p>Нет данных о социальных категориях</p>
              <button 
                className="curator-details-social-fill-btn"
                onClick={() => setShowSocialPortraitModal(true)}
              >
                Заполнить социальный портрет
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Модальные окна */}
      {showMonitorModal && (
        <div className="curator-details-modal-overlay" onClick={() => setShowMonitorModal(false)}>
          <div className="curator-details-modal large" onClick={(e) => e.stopPropagation()}>
            <div className="curator-details-modal-header">
              <h3>Смена старосты группы</h3>
              <p>Выберите нового старосту из списка</p>
              <button className="curator-details-modal-close" onClick={() => setShowMonitorModal(false)}>
                ×
              </button>
            </div>

            <div className="curator-details-modal-content">
              <div className="curator-details-search-box">
                <img src="/social-icons/search_icon.svg" alt="Поиск" />
                <input
                  type="text"
                  placeholder="Поиск по ФИО..."
                  value={monitorSearchTerm}
                  onChange={(e) => setMonitorSearchTerm(e.target.value)}
                  className="curator-details-search-input"
                />
                {monitorSearchTerm && (
                  <button 
                    className="curator-details-search-clear"
                    onClick={() => setMonitorSearchTerm('')}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="curator-details-students-list">
                {filteredMonitorStudents.map(student => (
                  <div 
                    key={student.id} 
                    className={`curator-details-student-option ${group.monitor.name === student.name ? 'current' : ''}`}
                    onClick={() => {
                      onChangeMonitor(student.name);
                      setShowMonitorModal(false);
                    }}
                  >
                    <div className="curator-details-student-info">
                      <div className="curator-details-student-name">{student.name}</div>
                      <div className="curator-details-student-details">
                        Ср. балл: {student.average.toFixed(1)} | Посещ.: {student.attendance}%
                      </div>
                    </div>
                    {group.monitor.name === student.name && (
                      <div className="curator-details-current-badge">Текущий староста</div>
                    )}
                  </div>
                ))}
                {filteredMonitorStudents.length === 0 && (
                  <div className="curator-details-empty-search">
                    Студенты не найдены
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSocialModal && selectedStudentForSocial && (
        <div className="curator-details-modal-overlay" onClick={() => setShowSocialModal(false)}>
          <div className="curator-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="curator-details-modal-header">
              <h3>Социальные данные</h3>
              <p>{selectedStudentForSocial.name}</p>
              <button className="curator-details-modal-close" onClick={() => setShowSocialModal(false)}>
                ×
              </button>
            </div>

            <div className="curator-details-modal-content">
              <div className="curator-details-form-group">
                <label>Адрес проживания</label>
                <input
                  type="text"
                  className="curator-details-input"
                  placeholder="Введите адрес"
                  value={socialFormData.address}
                  onChange={(e) => setSocialFormData({...socialFormData, address: e.target.value})}
                />
              </div>

              <div className="curator-details-form-group">
                <label>Основа обучения</label>
                <select 
                  className="curator-details-select"
                  value={socialFormData.education}
                  onChange={(e) => setSocialFormData({...socialFormData, education: e.target.value})}
                >
                  <option value="">Выберите основу</option>
                  <option value="Бюджет">Бюджет</option>
                  <option value="Платная">Платная</option>
                  <option value="Целевая">Целевая</option>
                </select>
              </div>

              <div className="curator-details-form-group">
                <label>Социальная категория</label>
                <select 
                  className="curator-details-select"
                  value={socialFormData.category}
                  onChange={(e) => setSocialFormData({...socialFormData, category: e.target.value})}
                >
                  <option value="">Выберите категорию</option>
                  <option value="Дети-сироты">Дети-сироты</option>
                  <option value="Дети из многодетных семей">Дети из многодетных семей</option>
                  <option value="Инвалиды и лица с ОВЗ">Инвалиды и лица с ОВЗ</option>
                  <option value="Малообеспеченные семьи">Малообеспеченные семьи</option>
                </select>
              </div>

              {/* Поле для годов рождения только для многодетных семей */}
              {socialFormData.category === 'Дети из многодетных семей' && (
                <div className="curator-details-form-group">
                  <label>Года рождения всех детей в семье</label>
                  <input
                    type="text"
                    className="curator-details-input"
                    placeholder="Например: 2018, 2020, 2022"
                    value={socialFormData.childrenBirthYears}
                    onChange={(e) => setSocialFormData({...socialFormData, childrenBirthYears: e.target.value})}
                  />
                  <small className="curator-details-form-hint">Укажите года рождения через запятую</small>
                </div>
              )}
            </div>

            <div className="curator-details-modal-actions">
              <button
                className="curator-details-btn-secondary"
                onClick={() => setShowSocialModal(false)}
              >
                Отмена
              </button>
              <button
                className="curator-details-btn-primary"
                onClick={handleSaveSocialData}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {showSocialPortraitModal && (
        <div className="curator-details-modal-overlay" onClick={() => setShowSocialPortraitModal(false)}>
          <div className="curator-details-modal large" onClick={(e) => e.stopPropagation()}>
            <div className="curator-details-modal-header">
              <h3>Социальный портрет группы</h3>
              <p>Заполните информацию о социальных категориях студентов</p>
              <button className="curator-details-modal-close" onClick={() => setShowSocialPortraitModal(false)}>
                ×
              </button>
            </div>

            <div className="curator-details-modal-content social-portrait-content">
              <div className="social-portrait-stepper">
                <div className="stepper-header">
                  <div className="stepper-steps">
                    <div className={`step ${socialPortraitCurrentStep === 1 ? 'active' : ''}`} data-step="1">
                      <div className="step-number">1</div>
                      <div className="step-label">Выбор категорий</div>
                    </div>
                    <div className={`step ${socialPortraitCurrentStep === 2 ? 'active' : ''}`} data-step="2">
                      <div className="step-number">2</div>
                      <div className="step-label">Назначение студентов</div>
                    </div>
                  </div>
                </div>
                
                <div className="stepper-content">
                  {socialPortraitCurrentStep === 1 && (
                    <div className="step-content active">
                      <div className="categories-grid">
                        {socialPortraitData.categories.map(category => (
                          <div 
                            key={category.id}
                            className={`category-card ${category.selected ? 'selected' : ''}`}
                            onClick={() => {
                              const newData = { ...socialPortraitData };
                              newData.categories = newData.categories.map(c =>
                                c.id === category.id ? { ...c, selected: !c.selected } : c
                              );
                              setSocialPortraitData(newData);
                            }}
                          >
                            <div className="category-card-icon">
                              <i className={category.icon}></i>
                            </div>
                            <div className="category-card-content">
                              <h5>{category.name}</h5>
                              <p>{category.description}</p>
                            </div>
                            <div className="category-card-check">
                              <i className="fas fa-check"></i>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {socialPortraitCurrentStep === 2 && (
                    <div className="step-content active">
                      <div className="two-column-layout">
                        {/* Левая колонка - список категорий */}
                        <div className="categories-sidebar">
                          <h4>Категории</h4>
                          <div className="categories-list">
                            {socialPortraitData.categories.filter(c => c.selected).map((category, index) => {
                              const selectedCount = category.students.filter(s => s.selected).length;
                              const isCurrentCategory = index === currentCategoryIndex;
                              
                              return (
                                <div 
                                  key={category.id}
                                  className={`category-sidebar-item ${isCurrentCategory ? 'active' : ''}`}
                                  onClick={() => setCurrentCategoryIndex(index)}
                                >
                                  <div className="category-sidebar-info">
                                    <i className={category.icon}></i>
                                    <span className="category-sidebar-name">{category.name}</span>
                                  </div>
                                  <span className="category-sidebar-count">
                                    {selectedCount}/{category.students.length}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Правая колонка - список студентов для текущей категории */}
                        <div className="students-sidebar">
                          {socialPortraitData.categories.filter(c => c.selected).length > 0 && (
                            <>
                              <div className="current-category-header">
                                <h4>
                                  {socialPortraitData.categories.filter(c => c.selected)[currentCategoryIndex]?.name}
                                </h4>
                                <p className="category-description">
                                  {socialPortraitData.categories.filter(c => c.selected)[currentCategoryIndex]?.description}
                                </p>
                              </div>

                              <div className="students-selection-area">
                                <div className="selection-controls">
                                  <div className="search-student">
                                    <i className="fas fa-search"></i>
                                    <img src="/social-icons/search_icon.svg" alt="Поиск" />
                                    <input 
                                      type="text" 
                                      placeholder="Поиск студентов..."
                                      value={categorySearchTerms[currentCategoryId] || ''}
                                      onChange={(e) => {
                                        setCategorySearchTerms({
                                          ...categorySearchTerms,
                                          [currentCategoryId]: e.target.value
                                        });
                                      }}
                                    />
                                    {categorySearchTerms[currentCategoryId] && (
                                      <button 
                                        className="search-clear"
                                        onClick={() => {
                                          const newTerms = { ...categorySearchTerms };
                                          delete newTerms[currentCategoryId];
                                          setCategorySearchTerms(newTerms);
                                        }}
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                  
                                  <button 
                                    className="btn-select-all"
                                    onClick={() => {
                                      const currentCategory = socialPortraitData.categories.filter(c => c.selected)[currentCategoryIndex];
                                      const filteredStudents = getFilteredStudents(currentCategory.id, currentCategory.students);
                                      const allSelected = filteredStudents.every(s => s.selected);
                                      
                                      const newData = { ...socialPortraitData };
                                      const categoryIndex = newData.categories.findIndex(c => c.id === currentCategory.id);
                                      
                                      filteredStudents.forEach(student => {
                                        const studentIndex = newData.categories[categoryIndex].students.findIndex(s => s.id === student.id);
                                        newData.categories[categoryIndex].students[studentIndex].selected = !allSelected;
                                      });
                                      
                                      setSocialPortraitData(newData);
                                    }}
                                  >
                                    <i className="fas fa-check-double"></i>
                                    {(() => {
                                      const currentCategory = socialPortraitData.categories.filter(c => c.selected)[currentCategoryIndex];
                                      const filteredStudents = getFilteredStudents(currentCategory.id, currentCategory.students);
                                      return filteredStudents.every(s => s.selected) ? 'Снять все' : 'Выбрать всех';
                                    })()}
                                  </button>
                                </div>

                                <div className="students-list full-height">
                                  {(() => {
                                    const currentCategory = socialPortraitData.categories.filter(c => c.selected)[currentCategoryIndex];
                                    const filteredStudents = getFilteredStudents(currentCategory.id, currentCategory.students);
                                    
                                    return filteredStudents.length > 0 ? (
                                      filteredStudents.map(student => (
                                        <label 
                                          key={student.id} 
                                          className={`student-checkbox ${student.selected ? 'checked' : ''}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={student.selected}
                                            onChange={(e) => {
                                              const newData = { ...socialPortraitData };
                                              const categoryIndex = newData.categories.findIndex(c => c.id === currentCategory.id);
                                              const studentIndex = newData.categories[categoryIndex].students.findIndex(s => s.id === student.id);
                                              newData.categories[categoryIndex].students[studentIndex].selected = e.target.checked;
                                              setSocialPortraitData(newData);
                                            }}
                                          />
                                          <span className="checkbox-custom"></span>
                                          <span className="student-name">{student.name}</span>
                                        </label>
                                      ))
                                    ) : (
                                      <div className="no-results">
                                        Студенты не найдены
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="stepper-footer">
                  <div className="stepper-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(socialPortraitCurrentStep / 2) * 100}%` }}></div>
                    </div>
                  </div>
                  
                  <div className="stepper-buttons">
                    {socialPortraitCurrentStep > 1 && (
                      <button className="button-secondary" onClick={handlePrevStep}>
                        Назад
                      </button>
                    )}
                    {socialPortraitCurrentStep < 2 ? (
                      <button className="button-primary" onClick={handleNextStep}>
                        Далее
                      </button>
                    ) : (
                      <button 
                        className="button-primary" 
                        onClick={() => {
                          // Сохраняем данные и закрываем модальное окно
                          console.log('Сохраненные данные:', socialPortraitData);
                          setShowSocialPortraitModal(false);
                        }}
                      >
                        <i className="fas fa-save"></i> Сохранить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
  </div>
)};