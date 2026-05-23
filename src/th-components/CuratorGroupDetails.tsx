import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './CuratorGroupDetails.css';
import { teacherApiService, SocialCategory, StudentDetails } from '../services/teacherApiService';

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
  birthDate?: string;
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
    phones: string[];
    emails: string[];
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
  onChangeMonitor: (newMonitorName: string[]) => void;
  onOpenSocialModal: (student: Student) => void;
  onSocialPortraitSaved?: () => void;
}

const validatePhone = (phone: string): boolean => {
  if (!phone || phone === '' || phone === '—') return true;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length === 11;
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) || email === '' || email === '—';
};

const validateFIO = (fio: string): boolean => {
  if (fio === '' || fio === '—') return true;
  const words = fio.trim().split(/\s+/);
  return words.length >= 2;
};

const CATEGORY_EXTRA_FIELDS: Record<number, { key: string; label: string; type: 'text' | 'number' | 'select' | 'textarea'; options?: string[]; placeholder?: string }[]> = {
  1: [{ key: 'Размер среднедушевого дохода (руб./мес.)', label: 'Размер среднедушевого дохода (руб./мес.)', type: 'number', placeholder: '25000' }],
  2: [{ key: 'Вид одаренности по диагностике', label: 'Вид одаренности', type: 'text' }],
  3: [
    { key: 'Количество несовершеннолетних детей в семье', label: 'Количество несовершеннолетних детей в семье', type: 'number', placeholder: '3' },
    { key: 'Года рождения всех детей из семьи', label: 'Года рождения всех детей из семьи', type: 'text', placeholder: '2006, 2010, 2015' }
  ],
  4: [{ key: 'Фактор риска', label: 'Фактор риска', type: 'select', options: ['академическая неуспеваемость', 'пропуски', 'девиантное поведение', 'конфликты'] }],
  5: [{ key: 'Описание ситуации', label: 'Описание ситуации', type: 'textarea', placeholder: 'Краткое описание ситуации...' }],
  6: [],
  7: [],
  8: [{ key: 'Статус пребывания', label: 'Статус пребывания', type: 'text', placeholder: 'Временное убежище, беженец...' }]
};

const enrichSpecialCategoryData = (
  categoryId: number,
  data: Record<string, string> = {}
): Record<string, string> => {
  const result = { ...data };
  if (categoryId === 6) {
    result['Сирота'] = 'да';
  }
  if (categoryId === 7) {
    result['Инвалид'] = 'да';
  }
  return result;
};

const normalizeStr = (s: string | null | undefined): string => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const CuratorGroupDetails: React.FC<CuratorGroupDetailsProps> = ({
  group,
  onBack,
  onChangeMonitor,
  onOpenSocialModal,
  onSocialPortraitSaved
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
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [socialCategories, setSocialCategories] = useState<SocialCategory[]>([]);
  
  // Снапшот категорий, загруженных с сервера — эти read-only
  const [serverCategories, setServerCategories] = useState<{ categoryId: number; categoryName: string; data: Record<string, string> }[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const hasValidationErrors = Object.values(validationErrors).some(Boolean);
  
  const monitorsList = useMemo(() => 
    group.monitor.name.split(/[,，、]/).map(m => m.trim()).filter(m => m), 
    [group.monitor.name]
  );
  
  const [selectedMonitors, setSelectedMonitors] = useState<string[]>(monitorsList);
  
  const [socialPortraitData, setSocialPortraitData] = useState<{
    categories: {
      id: number;
      name: string;
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
    categories: [],
    notes: '',
    supportNeeded: [],
    riskFactors: ''
  });

  const [socialFormData, setSocialFormData] = useState<{
    birthDate: string;
    phone: string;
    email: string;
    address: string;
    education: string;
    categories: { categoryId: number; categoryName: string; data: Record<string, string> }[];
  }>({
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    education: '',
    categories: []
  });

  useEffect(() => {
    setSelectedMonitors(monitorsList);
  }, [monitorsList]);

  useEffect(() => {
    const loadSocialCategories = async () => {
      try {
        const categories = await teacherApiService.getSocialCategories();
        setSocialCategories(categories);
        
        setSocialPortraitData(prev => ({
          ...prev,
          categories: categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            selected: group.socialPortrait.some(p => normalizeStr(p.category) === normalizeStr(cat.name)),
            students: group.students.map(s => ({
              id: s.id,
              name: s.name,
              selected: group.socialPortrait.some(p => 
                normalizeStr(p.category) === normalizeStr(cat.name) && p.students.some(st => st.id === s.id)
              )
            }))
          }))
        }));
      } catch (error) {
        console.error('Ошибка загрузки социальных категорий:', error);
      }
    };
    loadSocialCategories();
  }, [group]);

  const validateField = (field: string, value: string): string | null => {
    if (field === 'phone' || field === 'telephone') {
      if (value && value !== '—' && !validatePhone(value)) {
        return 'Введите корректный номер телефона';
      }
    }
    if (field === 'email') {
      if (value && value !== '—' && !validateEmail(value)) {
        return 'Введите корректный email (должен содержать @)';
      }
    }
    if (field === 'fio') {
      if (value && value !== '—' && !validateFIO(value)) {
        return 'ФИО должно содержать минимум 2 слова';
      }
    }
    return null;
  };

  const loadStudentDetails = useCallback(async (studentId: number, categories: SocialCategory[]) => {
    setIsLoadingDetails(true);
    try {
      const details: StudentDetails | null = await teacherApiService.getStudentDetails(studentId);
      
      if (!details) {
        console.warn('Детали студента не найдены');
        return;
      }

      const uniqueCategories = new Map();
      (details.socialCategories || []).forEach(sc => {
        const key = normalizeStr(sc.categoryName);
        if (!uniqueCategories.has(key)) {
          uniqueCategories.set(key, sc);
        }
      });

      const loadedCategories = Array.from(uniqueCategories.values()).map(sc => {
        let parsedData: Record<string, string> = {};
        try {
          parsedData = JSON.parse(sc.categoryData || '{}');
        } catch (e) {
          console.error('Error parsing category data:', e);
        }
        
        const category = categories.find(c => normalizeStr(c.name) === normalizeStr(sc.categoryName));
        
        if (!category) {
          console.warn(`Категория "${sc.categoryName}" не найдена в списке социальных категорий`);
          return null;
        }
        
        return {
          categoryId: category.id,
          categoryName: sc.categoryName,
          data: parsedData
        };
      }).filter((c): c is { categoryId: number; categoryName: string; data: Record<string, string> } => c !== null);

      const formatBirthDate = (dateStr: string | null): string => {
        if (!dateStr) return '';
        if (dateStr.includes('.') && dateStr.split('.').length === 3) {
          return dateStr;
        }
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}.${parts[1]}.${parts[0]}`;
        }
        return dateStr;
      };

      const newFormData = {
        birthDate: formatBirthDate(details.birthDate),
        phone: details.telephone || '',
        email: details.email || '',
        address: details.address || '',
        education: details.educationBasis || '',
        categories: loadedCategories
      };
      
      setSocialFormData(newFormData);
      setServerCategories(JSON.parse(JSON.stringify(loadedCategories)));
    } catch (error) {
      console.error('Error loading student details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  const handleOpenSocialModal = useCallback(async (student: Student) => {
    setSelectedStudentForSocial(student);
    setServerCategories([]);
    
    const initialFormData = {
      birthDate: student.birthDate || '',
      phone: student.phone || '',
      email: student.email || '',
      address: student.address || '',
      education: student.education || '',
      categories: []
    };
    setSocialFormData(initialFormData);
    setShowSocialModal(true);
    
    let categoriesToUse = socialCategories;
    if (categoriesToUse.length === 0) {
      try {
        categoriesToUse = await teacherApiService.getSocialCategories();
        setSocialCategories(categoriesToUse);
      } catch (e) {
        console.error('Не удалось загрузить социальные категории:', e);
      }
    }
    
    if (categoriesToUse.length > 0) {
      await loadStudentDetails(student.id, categoriesToUse);
    }
  }, [socialCategories, loadStudentDetails]);

  // Проверяет, была ли категория загружена с сервера
  const isCategoryReadOnly = useCallback((categoryId: number): boolean => {
    return serverCategories.some(sc => sc.categoryId === categoryId);
  }, [serverCategories]);

  const handleSaveSocialData = useCallback(async () => {
    if (!selectedStudentForSocial) return;

    const phoneError = validateField('phone', socialFormData.phone);
    const emailError = validateField('email', socialFormData.email);
  
  if (phoneError || emailError) {
    const errors: Record<string, string> = {};
    if (phoneError) errors.phone = phoneError;
    if (emailError) errors.email = emailError;
    setValidationErrors(errors);
    
    const notification = document.createElement('div');
    notification.className = 'curator-notification error';
    notification.textContent = 'Пожалуйста, исправьте ошибки в форме';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
    return;
  }
    
    try {
      const updateData: {
        id: number;
        telephone?: string | null;
        email?: string | null;
        address?: string | null;
        educationBasis?: string | null;
        birthDate?: string | null;
      } = { id: selectedStudentForSocial.id };
      
      updateData.telephone = socialFormData.phone || null;
      updateData.email = socialFormData.email || null;
      updateData.address = socialFormData.address || null;
      updateData.educationBasis = socialFormData.education || null;
      
      if (socialFormData.birthDate) {
        const dateParts = socialFormData.birthDate.split('.');
        if (dateParts.length === 3) {
          const day = dateParts[0].padStart(2, '0');
          const month = dateParts[1].padStart(2, '0');
          const year = dateParts[2];
          if (year && year.length === 4 && !isNaN(Number(day)) && !isNaN(Number(month)) && !isNaN(Number(year))) {
            updateData.birthDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (Object.keys(updateData).length > 1) {
        await teacherApiService.updateStudent(updateData);
      }

      // Сохраняем только НОВЫЕ категории (которых нет в serverCategories)
      for (const category of socialFormData.categories) {
        if (!category.categoryId || category.categoryId <= 0) continue;
        
        // Пропускаем, если категория уже была на сервере — read-only, не сохраняем повторно
        if (isCategoryReadOnly(category.categoryId)) {
          console.log(`Пропускаем категорию ${category.categoryId} — уже сохранена на сервере (read-only)`);
          continue;
        }

        console.log(`Сохраняем новую категорию: id=${category.categoryId}, name=${category.categoryName}`);

        const payloadData = enrichSpecialCategoryData(category.categoryId, category.data);

        await teacherApiService.saveStudentSocialCategory(
          selectedStudentForSocial.id,
          category.categoryId,
          payloadData
        );
      }
      
      setServerCategories(JSON.parse(JSON.stringify(socialFormData.categories)));
      
      teacherApiService.invalidateStudentDetailsCache(selectedStudentForSocial.id);
      teacherApiService.invalidateStudentCache();
      teacherApiService.invalidateSocialCache();
      
      setShowSocialModal(false);
      
      const notification = document.createElement('div');
      notification.className = 'curator-notification success';
      notification.textContent = 'Данные успешно сохранены';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);

      if (onSocialPortraitSaved) {
        onSocialPortraitSaved();
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      const notification = document.createElement('div');
      notification.className = 'curator-notification error';
      notification.textContent = 'Ошибка при сохранении данных';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }
  }, [selectedStudentForSocial, socialFormData, serverCategories, isCategoryReadOnly, onSocialPortraitSaved]);

  const handleCopyCategoryList = useCallback((categoryName: string) => {
    const category = group.socialPortrait.find(c => normalizeStr(c.category) === normalizeStr(categoryName));
    if (category && category.students.length > 0) {
      const listText = `${categoryName} из ${group.number}:\n${category.students.map(s => s.name).join('\n')}`;
      navigator.clipboard.writeText(listText);
    }
  }, [group.socialPortrait, group.number]);

  const getFilteredStudents = useCallback((categoryId: number, students: { id: number; name: string; selected: boolean }[]) => {
    const searchTerm = categorySearchTerms[categoryId] || '';
    if (!searchTerm) return students;
    return students.filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categorySearchTerms]);

  const getAttendanceColor = useCallback((attendance: number): string => {
    if (attendance >= 90) return '#2cbb00';
    if (attendance >= 75) return '#a5db28';
    if (attendance >= 60) return '#f59e0b';
    return '#ef4444';
  }, []);

  const getGradeColor = useCallback((grade: number): string => {
    if (grade >= 4.5) return '#2cbb00';
    if (grade >= 3.5) return '#a5db28';
    if (grade >= 2.5) return '#f59e0b';
    return '#ef4444';
  }, []);

  const currentCategoryId = socialPortraitData.categories.filter(c => c.selected)[currentCategoryIndex]?.id || 0;

  const filteredMonitorStudents = useMemo(() => 
    [...group.students]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter(student => student.name.toLowerCase().includes(monitorSearchTerm.toLowerCase())),
    [group.students, monitorSearchTerm]
  );

  const sortedStudents = useMemo(() => 
    [...group.students].sort((a, b) => a.name.localeCompare(b.name)),
    [group.students]
  );

  const handleNextStep = useCallback(() => {
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
  }, [socialPortraitCurrentStep, socialPortraitData.categories]);

  const handlePrevStep = useCallback(() => {
    if (socialPortraitCurrentStep > 1) {
      setSocialPortraitCurrentStep(prev => prev - 1);
    }
  }, [socialPortraitCurrentStep]);

  const handleSaveSocialPortrait = useCallback(async () => {
    try {
      for (const category of socialPortraitData.categories) {
        if (category.selected) {
          const selectedStudents = category.students.filter(s => s.selected);
          
          const existingCategory = group.socialPortrait.find(p => normalizeStr(p.category) === normalizeStr(category.name));
          const existingStudentIds = new Set(existingCategory?.students.map(s => s.id) || []);
          
          for (const student of selectedStudents) {
            if (existingStudentIds.has(student.id)) {
              continue;
            }
            
          const data: Record<string, string> = {};

          // Автоматически добавляем обязательные поля для спец. категорий
          if (category.id === 6) {
            data['Сирота'] = 'да';
          }
          if (category.id === 7) {
            data['Инвалид'] = 'да';
          }

          if (normalizeStr(category.name) === normalizeStr('Дети из многодетных семей')) {
            const studentData = group.students.find(s => s.id === student.id);
            if (studentData?.childrenBirthYears) {
              data['Года рождения всех детей из семьи'] = studentData.childrenBirthYears;
            }
          }
          await teacherApiService.saveStudentSocialCategory(student.id, category.id, data);
          }
        }
      }
      
      setShowSocialPortraitModal(false);
      
      teacherApiService.invalidateSocialCache();
      teacherApiService.invalidateStudentCache();
      
      if (onSocialPortraitSaved) {
        onSocialPortraitSaved();
      }
    } catch (error) {
      console.error('Ошибка сохранения социального портрета:', error);
      alert('Не удалось сохранить социальный портрет');
    }
  }, [socialPortraitData.categories, group.socialPortrait, group.students, onSocialPortraitSaved]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      onBack();
    }, 1000);
  }, [onBack]);

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

      <div className="curator-group-info-header">
        <div className="group-info-main">
          <h1>Группа {group.number}</h1>
          <p className="group-specialty">{group.specialty}</p>
          <div className="group-stats">
            <span className="stat-badge">{group.course} курс</span>
            <span className="stat-badge">{group.studentsCount} студентов</span>
          </div>
        </div>
      </div>

      <div className="curator-details-monitor-section">
        <div className="curator-details-monitor-rows">
          {monitorsList.map((monitor, idx) => (
            <div key={idx} className="curator-details-monitor-row">
              <div 
                className="curator-details-monitor-name clickable" 
                onClick={() => setShowMonitorModal(true)}
                title="Нажмите для смены старосты"
              >
                {monitor}
              </div>
              <div className="curator-details-monitor-contact-item">
                <div className="monitor-contact-details">
                  {group.monitor.phones[idx] && (
                    <span className="meta-phone">
                      <span className="meta-label">Тел.:</span> {group.monitor.phones[idx]}
                    </span>
                  )}
                  {group.monitor.emails[idx] && (
                    <span className="meta-email">
                      <span className="meta-label">Email:</span> {group.monitor.emails[idx]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
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
                <th className="curator-details-col-actions">Данные</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student, index) => {
                const isMonitor = monitorsList.includes(student.name);
                return (
                  <tr 
                    key={student.id}
                    className={isMonitor ? 'current-monitor' : ''}
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
                );
              })}
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

        <div className="social-portrait-hint">
          <div className="hint-text">
            <strong>Необходимо дополнить данные о категориях студентов</strong>
            <br />
            Для заполнения дополнительных полей (размер дохода, факторы риска, описание ситуации и др.) 
            нажмите на кнопку <strong>«Заполнить информацию о студенте»</strong> (✎) в таблице напротив нужного студента
          </div>
        </div>
      </div>

      {/* Модальное окно смены старосты */}
      {showMonitorModal && (
        <div className="curator-details-modal-overlay" onClick={() => setShowMonitorModal(false)}>
          <div className="curator-details-modal monitor-selection-modal" onClick={(e) => e.stopPropagation()}>
            <div className="curator-details-modal-header">
              <h3>Смена старосты группы</h3>
              <p>Выберите одного или нескольких студентов в качестве старост</p>
              <button className="curator-details-modal-close" onClick={() => setShowMonitorModal(false)}>
                ×
              </button>
            </div>

            <div className="curator-details-modal-content">
              <div className="monitor-search-section">
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

                <div className="curator-details-selection-info">
                  <span className="selection-count">
                    Выбрано старост: <strong>{selectedMonitors.length}</strong>
                  </span>
                  {selectedMonitors.length > 0 && (
                    <button 
                      className="clear-selection-btn"
                      onClick={() => setSelectedMonitors([])}
                    >
                      Очистить все
                    </button>
                  )}
                </div>
              </div>

              <div className="curator-details-students-list">
                {filteredMonitorStudents.map(student => {
                  const isSelected = selectedMonitors.includes(student.name);
                  return (
                    <div 
                      key={student.id} 
                      className={`curator-details-student-option ${isSelected ? 'selected' : ''}`}
                    >
                      <div 
                        className="curator-details-student-checkbox"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMonitors(selectedMonitors.filter(name => name !== student.name));
                          } else {
                            setSelectedMonitors([...selectedMonitors, student.name]);
                          }
                        }}
                      >
                        <div className={`checkbox-custom ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <span>✓</span>}
                        </div>
                      </div>
                      <div 
                        className="curator-details-student-info"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMonitors(selectedMonitors.filter(name => name !== student.name));
                          } else {
                            setSelectedMonitors([...selectedMonitors, student.name]);
                          }
                        }}
                      >
                        <div className="curator-details-student-name">{student.name}</div>
                        <div className="curator-details-student-details">
                          Ср. балл: {student.average.toFixed(1)} | Посещ.: {student.attendance}%
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredMonitorStudents.length === 0 && (
                  <div className="curator-details-empty-search">
                    Студенты не найдены
                  </div>
                )}
              </div>
            </div>

            <div className="curator-details-modal-actions">
              <button className="button-secondary" onClick={() => setShowMonitorModal(false)}>
                Отмена
              </button>
              <button 
                className="button-primary" 
                onClick={() => {
                  onChangeMonitor(selectedMonitors);
                  setShowMonitorModal(false);
                }}
              >
                Сохранить ({selectedMonitors.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно социальных данных */}
      {showSocialModal && selectedStudentForSocial && (
        <div className="curator-details-modal-overlay" onClick={() => setShowSocialModal(false)}>
          <div className="curator-details-modal social-data-modal" onClick={(e) => e.stopPropagation()}>
            <div className="curator-details-modal-header">
              <h3>Заполнение информации о студенте</h3>
              <p>{selectedStudentForSocial.name}</p>
              <button className="curator-details-modal-close" onClick={() => setShowSocialModal(false)}>
                ×
              </button>
            </div>

            <div className="curator-details-modal-content">
              {isLoadingDetails && (
                <div className="social-loading-overlay">
                  Загрузка данных...
                </div>
              )}

              <div className="two-columns-form">
                {/* Левая колонка — всегда редактируемая */}
                <div className="form-column">
                  <div className="curator-details-form-group">
                    <label>Дата рождения (дд.мм.гггг)</label>
                    <input
                      type="text"
                      className="curator-details-input"
                      placeholder="день.месяц.год"
                      value={socialFormData.birthDate}
                      onChange={(e) => {
                        let value = e.target.value;
                        const cleaned = value.replace(/[^\d]/g, '');
                        if (cleaned.length <= 2) {
                          value = cleaned;
                        } else if (cleaned.length <= 4) {
                          value = `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
                        } else if (cleaned.length <= 8) {
                          value = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 4)}.${cleaned.slice(4)}`;
                        } else {
                          value = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 4)}.${cleaned.slice(4, 8)}`;
                        }
                        setSocialFormData({...socialFormData, birthDate: value});
                      }}
                      maxLength={10}
                    />
                  </div>

                  <div className="curator-details-form-group">
                    <label>Телефон</label>
                    <input
                      type="tel"
                      className={`curator-details-input ${validationErrors.phone ? 'validation-error' : ''}`}
                      placeholder="+7 (XXX) XXX-XX-XX"
                      value={socialFormData.phone}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const error = validateField('phone', newValue);
                        setValidationErrors(prev => ({ ...prev, phone: error || '' }));
                        setSocialFormData({...socialFormData, phone: newValue});
                      }}
                      onBlur={(e) => {
                        const error = validateField('phone', e.target.value);
                        setValidationErrors(prev => ({ ...prev, phone: error || '' }));
                      }}
                    />
                    {validationErrors.phone && (
                      <div className="validation-error-message">{validationErrors.phone}</div>
                    )}
                  </div>

                  <div className="curator-details-form-group">
                    <input
                      type="email"
                      className={`curator-details-input ${validationErrors.email ? 'validation-error' : ''}`}
                      placeholder="student@example.com"
                      value={socialFormData.email}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const error = validateField('email', e.target.value);
                        setValidationErrors(prev => ({ ...prev, email: error || '' }));
                        setSocialFormData({...socialFormData, email: newValue});
                      }}
                      onBlur={(e) => {
                        const error = validateField('email', e.target.value);
                        if (error) {
                          setValidationErrors(prev => ({ ...prev, email: error }));
                        }
                      }}
                    />
                    {validationErrors.email && (
                      <div className="validation-error-message">{validationErrors.email}</div>
                    )}
                  </div>

                  <div className="curator-details-form-group">
                    <label>Адрес проживания</label>
                    <input
                      type="text"
                      className="curator-details-input"
                      placeholder="Введите полный адрес"
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
                      <option value="">Выберите основу обучения</option>
                      <option value="Федеральный бюджет">Федеральный бюджет</option>
                      <option value="Региональный бюджет">Региональный бюджет</option>
                      <option value="Платная">Платная</option>
                    </select>
                  </div>
                </div>

                {/* Правая колонка — Социальные категории */}
                <div className="form-column">
                  <div className="curator-details-form-group">
                    <label>Социальные категории</label>
                    <div className="social-categories-list">
                      {socialCategories.map(category => {
                        const selectedCategory = socialFormData.categories.find(c => c.categoryId === category.id);
                        const isSelected = !!selectedCategory;
                        const extraFields = CATEGORY_EXTRA_FIELDS[category.id] || [];
                        const readOnly = isCategoryReadOnly(category.id);

                        return (
                          <div 
                            key={category.id} 
                            className={`social-category-item ${isSelected ? 'selected' : ''} ${readOnly ? 'read-only' : ''}`}
                          >
                            <label className="social-category-label">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (readOnly) {
                                    // Нельзя снять уже сохранённую категорию
                                    return;
                                  }
                                  if (e.target.checked) {
                                    setSocialFormData(prev => ({
                                      ...prev,
                                      categories: [...prev.categories, { 
                                        categoryId: category.id, 
                                        categoryName: category.name, 
                                        data: {} 
                                      }]
                                    }));
                                  } else {
                                    setSocialFormData(prev => ({
                                      ...prev,
                                      categories: prev.categories.filter(c => c.categoryId !== category.id)
                                    }));
                                  }
                                }}
                                disabled={readOnly}
                              />
                              <span className="social-category-name">
                                {category.name}
                                {readOnly && <span className="read-only-badge"></span>}
                              </span>
                            </label>

                            {isSelected && extraFields.length > 0 && (
                              <div className="extra-fields">
                                {extraFields.map(field => (
                                  <div key={field.key} className="extra-field">
                                    <label>{field.label}</label>
                                    {field.type === 'select' ? (
                                      <select
                                        className="curator-details-select"
                                        value={selectedCategory.data[field.key] || ''}
                                        onChange={(e) => {
                                          if (readOnly) return;
                                          setSocialFormData(prev => ({
                                            ...prev,
                                            categories: prev.categories.map(c => 
                                              c.categoryId === category.id 
                                                ? { ...c, data: { ...c.data, [field.key]: e.target.value } }
                                                : c
                                            )
                                          }));
                                        }}
                                        disabled={readOnly}
                                      >
                                        <option value="">Выберите...</option>
                                        {field.options?.map(opt => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    ) : field.type === 'textarea' ? (
                                      <textarea
                                        className="curator-details-input"
                                        rows={2}
                                        placeholder={field.placeholder}
                                        value={selectedCategory.data[field.key] || ''}
                                        onChange={(e) => {
                                          if (readOnly) return;
                                          setSocialFormData(prev => ({
                                            ...prev,
                                            categories: prev.categories.map(c => 
                                              c.categoryId === category.id 
                                                ? { ...c, data: { ...c.data, [field.key]: e.target.value } }
                                                : c
                                            )
                                          }));
                                        }}
                                        disabled={readOnly}
                                      />
                                    ) : (
                                      <input
                                        type={field.type === 'number' ? 'number' : 'text'}
                                        className="curator-details-input"
                                        placeholder={field.placeholder}
                                        value={selectedCategory.data[field.key] || ''}
                                        onChange={(e) => {
                                          if (readOnly) return;
                                          setSocialFormData(prev => ({
                                            ...prev,
                                            categories: prev.categories.map(c => 
                                              c.categoryId === category.id 
                                                ? { ...c, data: { ...c.data, [field.key]: e.target.value } }
                                                : c
                                            )
                                          }));
                                        }}
                                        disabled={readOnly}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="curator-details-modal-actions">
              <button
                className="button-secondary"
                onClick={() => setShowSocialModal(false)}
              >
                Отмена
              </button>
              <button
                className="button-primary"
                onClick={handleSaveSocialData}
                disabled={isLoadingDetails || hasValidationErrors}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно социального портрета */}
      {showSocialPortraitModal && (
        <div className="curator-details-modal-overlay" onClick={() => setShowSocialPortraitModal(false)}>
          <div className="curator-details-modal monitor-modal" onClick={(e) => e.stopPropagation()}>
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
                            <div className="category-card-content">
                              <h5>{category.name}</h5>
                            </div>
                            <div className="category-card-check">
                              {category.selected && <span>✓</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {socialPortraitCurrentStep === 2 && (
                    <div className="step-content active">
                      <div className="two-column-layout">
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

                        <div className="students-sidebar">
                          {socialPortraitData.categories.filter(c => c.selected).length > 0 && (
                            <>
                              <div className="current-category-header">
                                <h4>
                                  {socialPortraitData.categories.filter(c => c.selected)[currentCategoryIndex]?.name}
                                </h4>
                              </div>

                              <div className="students-selection-area">
                                <div className="selection-controls">
                                  <div className="search-student">
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
                        onClick={handleSaveSocialPortrait}
                      >
                        Сохранить
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
  );
};