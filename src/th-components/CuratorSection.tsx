import React, { useState, useMemo, useEffect } from 'react';
import './CuratorSection.css';
import { CuratorGroupDetails } from './CuratorGroupDetails';
import { teacherApiService, CuratorGroupStats, StudentPerformance, GroupInfo, GroupLeader, StudentInfo, SocialCategory, GroupSocialStats } from '../services/teacherApiService';

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

interface SocialPortraitItem {
  category: string;
  categoryId: number;
  students: {
    id: number;
    name: string;
  }[];
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
  socialPortrait: SocialPortraitItem[];
}

let socialCategoriesCache: SocialCategory[] | null = null;

export const CuratorSection: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [sortBy, setSortBy] = useState('group');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedStudentForSocial, setSelectedStudentForSocial] = useState<Student | null>(null);
  const [socialFormData, setSocialFormData] = useState({
    category: '',
    childrenBirthYears: '',
    address: '',
    education: '',
    phone: '',
    email: '',
    birthDate: ''
  });

  const getCurrentUserId = (): number | null => {
    const storedUserId = localStorage.getItem('teacher_id');
    if (storedUserId) {
      return parseInt(storedUserId);
    }
    return null;
  };

  const fetchCuratorGroups = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        setError('Не удалось определить текущего пользователя');
        setLoading(false);
        return;
      }
      
      const curatorGroups = await teacherApiService.getCuratorGroups(currentUserId);
      
      if (!curatorGroups || curatorGroups.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

    const mappedGroups: Group[] = curatorGroups.map((g: CuratorGroupStats) => ({
      id: g.groupNumber,
      number: g.groupNumber.toString(),
      specialty: g.specialty,
      course: g.course,
      studentsCount: g.studentsCount,
      averageAttendance: g.attendancePercentage,
      averageGrade: g.averageGrade,
      monitor: {
        name: g.leadersFio || '',
        appointedDate: '',
        phones: [],
        emails: []
      },
      students: [],
      socialPortrait: []
    }));

      setGroups(mappedGroups);
    } catch (err) {
      console.error('Ошибка:', err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuratorGroups();
  }, []);

  const fetchGroupDetails = async (group: Group) => {
    setLoading(true);
    
    try {
      const groupInfo = await teacherApiService.getGroupInfoByNumber(group.number);
      
      if (!groupInfo) {
        setError('Не удалось найти информацию о группе');
        setLoading(false);
        return;
      }
      
      const realGroupId = groupInfo.id;
      
      const groupStats = await teacherApiService.getCuratorGroupStats(realGroupId);
      
      if (!groupStats) {
        setError('Не удалось загрузить статистику группы');
        setLoading(false);
        return;
      }
      
      const [studentsPerformance, studentsInfo, socialStats] = await Promise.all([
        teacherApiService.getGroupStudentsPerformance(realGroupId),
        teacherApiService.getGroupStudentsInfo(realGroupId),
        teacherApiService.getGroupSocialStats(realGroupId)
      ]);

      const studentsDetailsPromises = studentsInfo.map(student => 
        teacherApiService.getStudentDetails(student.id)
      );
      const studentsDetails = await Promise.all(studentsDetailsPromises);

      let allCategories = socialCategoriesCache;
      if (!allCategories) {
        allCategories = await teacherApiService.getSocialCategories();
        socialCategoriesCache = allCategories;
      }

      const socialPromises = socialStats.map(async (stat) => {
        const category = allCategories!.find(c => c.id === stat.id);
        if (!category) return null;

        const studentsInCategory = await teacherApiService.getStudentsInSocialCategoryFormatted(
          realGroupId, 
          stat.id
        );
        
        const uniqueStudents = Array.from(
          new Map(studentsInCategory.map(s => [s.id, s])).values()
        );

        return {
          category: category.name,
          categoryId: category.id,
          students: uniqueStudents.map(s => ({
            id: s.id,
            name: s.fio
          }))
        };
      });

      const socialPortraitItems = (await Promise.all(socialPromises))
        .filter((item): item is SocialPortraitItem => item !== null);

      const studentsMap = new Map(studentsInfo.map(s => [s.id, s]));
      const detailsMap = new Map(studentsDetails.map(d => d ? [d.id, d] : [null, null]));
      
      const students: Student[] = studentsPerformance.map(perf => {
        const info = studentsMap.get(perf.id);
        const details = detailsMap.get(perf.id);
        
        return {
          id: perf.id,
          name: `${perf.lastName} ${perf.firstName} ${perf.patronymic || ''}`.trim(),
          attendance: perf.attendanceCount,
          math: perf.averageGrade,
          programming: perf.averageGrade,
          databases: perf.averageGrade,
          average: perf.averageGrade,
          status: 'active',
          address: details?.address || info?.address || '',
          education: details?.educationBasis || info?.educationBasis || '',
          phone: details?.telephone || info?.telephone || '',
          email: details?.email || info?.email || '',
          birthDate: details?.birthDate || info?.birthDate || ''
        };
      });

      const leaders = await teacherApiService.getGroupLeader(realGroupId);
      
      const leaderNames = groupStats.leadersFio?.split(/[,，、]/).map((n: string) => n.trim()).filter(Boolean) || [];
      const leaderContacts = leaderNames.map((name: string) => {
        const student = students.find(s => s.name === name);
        return {
          phone: student?.phone || '',
          email: student?.email || ''
        };
      });

      setSelectedGroup({
        ...group,
        id: realGroupId,
        studentsCount: groupStats.studentsCount,
        averageAttendance: groupStats.attendancePercentage,
        averageGrade: groupStats.averageGrade,
        students,
        socialPortrait: socialPortraitItems,
        monitor: {
          name: groupStats.leadersFio || '',
          appointedDate: new Date().toLocaleDateString('ru-RU'),
          phones: leaderContacts.map((c: { phone: string }) => c.phone),
          emails: leaderContacts.map((c: { email: string }) => c.email)
        }
      });
    } catch (error) {
      console.error('Ошибка загрузки деталей группы:', error);
      setError('Не удалось загрузить данные группы');
      setSelectedGroup(group);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeMonitor = async (newMonitorNames: string[]) => {
    if (!selectedGroup) return;
    
    try {
      const groupId = selectedGroup.id;
      
      const updatePromises = selectedGroup.students.map(async (s: Student) => {
        const isLeader = newMonitorNames.includes(s.name);
        return teacherApiService.updateStudent({
          id: s.id,
          isLeader: isLeader
        });
      });
      
      await Promise.all(updatePromises);
      
      const phones: string[] = [];
      const emails: string[] = [];
      
      for (const monitorName of newMonitorNames) {
        const student = selectedGroup.students.find(s => s.name === monitorName);
        if (student) {
          phones.push(student.phone || '');
          emails.push(student.email || '');
        }
      }
      
      setSelectedGroup({
        ...selectedGroup,
        monitor: {
          ...selectedGroup.monitor,
          name: newMonitorNames.join(', '),
          appointedDate: new Date().toLocaleDateString('ru-RU'),
          phones: phones,
          emails: emails
        }
      });
      
      teacherApiService.invalidateGroupLeaderCache(groupId);
      teacherApiService.invalidateStudentCache();
    } catch (error) {
      console.error('Ошибка смены старосты:', error);
      alert('Не удалось сменить старосту. Попробуйте позже.');
    }
  };

  const filteredGroups = useMemo(() => {
    let result = [...groups];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(group =>
        group.number.toLowerCase().includes(term) ||
        group.specialty.toLowerCase().includes(term) ||
        group.monitor.name.toLowerCase().includes(term)
      );
    }

    if (courseFilter !== 'all') {
      result = result.filter(group => group.course.toString() === courseFilter);
    }

    result.sort((a, b) => {
      let valueA: string | number, valueB: string | number;
      
      switch(sortBy) {
        case 'group':
          valueA = a.number;
          valueB = b.number;
          break;
        case 'course':
          valueA = a.course;
          valueB = b.course;
          break;
        case 'specialty':
          valueA = a.specialty;
          valueB = b.specialty;
          break;
        case 'students':
          valueA = a.studentsCount;
          valueB = b.studentsCount;
          break;
        case 'attendance':
          valueA = a.averageAttendance;
          valueB = b.averageAttendance;
          break;
        case 'performance':
          valueA = a.averageGrade;
          valueB = b.averageGrade;
          break;
        default:
          valueA = a.number;
          valueB = b.number;
      }

      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    return result;
  }, [groups, searchTerm, courseFilter, sortBy, sortOrder]);

  const formatNumber = (value: number, decimals: number = 1): string => {
    return value.toFixed(decimals);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    teacherApiService.invalidateSocialCache();
    teacherApiService.invalidateStudentCache();
    teacherApiService.invalidateGroupLeaderCache();
    teacherApiService.invalidateTeacherCache();
    fetchCuratorGroups().finally(() => {
      setTimeout(() => {
        setRefreshing(false);
      }, 500);
    });
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleGroupClick = async (group: Group) => {
    await fetchGroupDetails(group);
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
  };

  const handleOpenSocialModal = (student: Student) => {
    setSelectedStudentForSocial(student);
    setSocialFormData({
      category: student.category || '',
      childrenBirthYears: student.childrenBirthYears || '',
      address: student.address || '',
      education: student.education || '',
      phone: student.phone || '',
      email: student.email || '',
      birthDate: student.birthDate || ''
    });
  };

  const InfoIcon = ({ title, description }: { title: string; description: string }) => (
    <div className="info-icon-btn" tabIndex={0}>
      <button className="header-btn" type="button">
        <span className="info-icon-text">i</span>
        <span>Информация</span>
      </button>
      <div className="info-tooltip small">
        <div className="info-tooltip-content">
          <div className="info-header">
            <div className="info-title">
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </div>
          
          <div className="info-section">
            <h4>Основные возможности</h4>
            <div className="features-grid">
              {title.includes('Кураторские') ? (
                <>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Просмотр списка кураторских групп</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Фильтрация по курсам</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Сортировка по различным параметрам</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Информация о старостах групп</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Просмотр списка студентов</span>
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
                </>
              )}
            </div>
          </div>

          <div className="info-section">
            <h4>Как использовать</h4>
            <div className="usage-steps">
              {title.includes('Кураторские') ? (
                <>
                  <div className="steps">
                    <span className="steps-number">1</span>
                    <span>Используйте фильтры для поиска нужных групп</span>
                  </div>
                  <div className="steps">
                    <span className="steps-number">2</span>
                    <span>Нажмите на группу для просмотра детальной информации</span>
                  </div>
                  <div className="steps">
                    <span className="steps-number">3</span>
                    <span>Обновляйте данные при необходимости</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="step">
                    <span className="step-number">1</span>
                    <span>Для смены старосты нажмите "Сменить старосту"</span>
                  </div>
                  <div className="step">
                    <span className="step-number">2</span>
                    <span>Для заполнения социальных данных нажмите кнопку с карандашом</span>
                  </div>
                  <div className="step">
                    <span className="step-number">3</span>
                    <span>Для управления социальным портретом нажмите "Заполнить данные"</span>
                  </div>
                </>
              )}
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
      disabled={refreshing || loading}
    >
      <img 
        src="/st-icons/upload_icon.svg" 
        className={`pc-refresh-icon ${refreshing ? 'pc-refresh-spin' : ''}`}
        alt="Обновить"
      />
      <span>{refreshing ? 'Обновление...' : loading ? 'Загрузка...' : 'Обновить данные'}</span>
    </button>
  );

  const renderGroupCard = (group: Group) => {
    return (
      <div key={group.id} className="curator-group-card" onClick={() => handleGroupClick(group)}>
        <div className="curator-card-top">
          <div className="curator-card-group-header">
            <div className="curator-card-group-number">
              <span className="curator-group-number-label">Группа</span>
              <span className="curator-group-number-value">{group.number}</span>
            </div>
            <div className="curator-card-course">
              <span className="curator-course-label">{group.course} курс</span>
            </div>
          </div>
          
          <div className="curator-card-specialty">
            <h4>{group.specialty}</h4>
          </div>
        </div>
        
        <div className="curator-card-students-compact">
          <span className="curator-students-icon"><img src="/social-icons/filter_icon.svg" alt="студенты"/></span>
          <span className="curator-students-count">{group.studentsCount} студентов</span>
        </div>
        
        <div className="curator-card-metrics">
          <div className="curator-card-metric">
            <div className="curator-metric-header">
              <span className="curator-metric-label">Посещаемость</span>
              <span className="curator-metric-value">{formatNumber(group.averageAttendance)}%</span>
            </div>
            <div className="curator-metric-progress">
              <div 
                className="curator-metric-progress-fill" 
                style={{ width: `${group.averageAttendance}%`, background: '#002FA7' }}
              ></div>
            </div>
          </div>
          
          <div className="curator-card-metric">
            <div className="curator-metric-header">
              <span className="curator-metric-label">Успеваемость</span>
              <span className="curator-metric-value">{group.averageGrade.toFixed(1)}</span>
            </div>
            <div className="curator-metric-progress">
              <div 
                className="curator-metric-progress-fill" 
                style={{ width: `${Math.min(group.averageGrade * 20, 100)}%`, background: '#002FA7' }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="curator-card-headman">
          <div className="curator-headman-item">
            <span className="curator-headman-label">Староста</span>
            <div className="curator-headman-value">
              {group.monitor.name.split(/[,，、]/).map((name, idx) => (
                <div key={idx} className="curator-monitor-name-line">
                  {name.trim()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGroupListItem = (group: Group, index: number) => {
    return (
      <div key={group.id} className="curator-group-list-item" onClick={() => handleGroupClick(group)}>        
        <div className="curator-list-main">
          <div className="curator-list-header">
            <div className="curator-list-group-info">
              <span className="curator-list-group-number">{group.number}</span>
              <span className="curator-list-course-badge">{group.course} курс</span>
            </div>
            <div className="curator-list-specialty">{group.specialty}</div>
          </div>
          
          <div className="curator-list-details">
            <div className="curator-list-detail compact">
              <span className="curator-students-icon"><img src="/social-icons/filter_icon.svg" alt="студенты"/></span>
              <span className="curator-detail-value">{group.studentsCount}</span>
            </div>
            <div className="curator-list-detail">
              <span className="curator-detail-label">Староста:</span>
              <div className="curator-detail-value-multiline">
                {group.monitor.name.split(/[,，、]/).map((name, idx) => (
                  <div key={idx}>{name.trim()}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="curator-list-metrics">
          <div className="curator-list-metric">
            <div className="curator-list-metric-header">
              <span>Посещаемость</span>
              <span>{formatNumber(group.averageAttendance)}%</span>
            </div>
            <div className="curator-list-progress">
              <div 
                className="curator-list-progress-fill" 
                style={{ width: `${group.averageAttendance}%`, background: '#002FA7' }}
              ></div>
            </div>
          </div>
          
          <div className="curator-list-metric">
            <div className="curator-list-metric-header">
              <span>Успеваемость</span>
              <span>{group.averageGrade.toFixed(1)}</span>
            </div>
            <div className="curator-list-progress">
              <div 
                className="curator-list-progress-fill" 
                style={{ width: `${Math.min(group.averageGrade * 20, 100)}%`, background: '#002FA7' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <div className="curator-empty-state">
        <p>За вами не назначены кураторские группы</p>
        <p className="curator-empty-subtitle">Данный функционал отсутствует для вас</p>
      </div>
    );
  };

  return (
    <div className="curator-groups-section">
      {!selectedGroup && (
        <div className="curator-cabinet-header">
          <InfoIcon 
            title="Кураторские группы"
            description="Здесь отображаются все группы, закрепленные за вами как за куратором."
          />
          <div className="curator-header-actions">
            <RefreshButton />
          </div>
        </div>
      )}

      {error && (
        <div className="curator-error-message">
          <span>{error}</span>
        </div>
      )}

      {selectedGroup ? (
        <CuratorGroupDetails
          group={selectedGroup}
          onBack={handleBackToGroups}
          onChangeMonitor={handleChangeMonitor}
          onOpenSocialModal={handleOpenSocialModal}
          onSocialPortraitSaved={() => {
            if (selectedGroup) {
              teacherApiService.invalidateSocialCache();
              teacherApiService.invalidateStudentCache();
              fetchGroupDetails(selectedGroup);
            }
          }}
        />
      ) : (
        <>
          {groups.length > 0 && (
            <div className="curator-control-panel-enhanced">
              <div className="curator-controls-top-row">
                <div className="curator-search-box-enhanced">
                  <input
                    type="text"
                    placeholder="Поиск по номеру группы, специальности или старосте..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="curator-search-input-enhanced"
                  />
                  <div className="curator-search-icon">
                    <img src="/social-icons/search_icon.svg" alt="Поиск" />
                  </div>
                </div>
                
                <div className="curator-view-toggle">
                  <button 
                    className={`curator-view-btn ${viewMode === 'cards' ? 'curator-view-active' : ''}`}
                    onClick={() => setViewMode('cards')}
                    title="Карточки"
                  >
                    <img src="/social-icons/cards_icon.svg" alt="Карточки" />
                    <span>Карточки</span>
                  </button>
                  <button 
                    className={`curator-view-btn ${viewMode === 'list' ? 'curator-view-active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="Список"
                  >
                    <img src="/social-icons/list_icon.svg" alt="Список" />
                    <span>Список</span>
                  </button>
                </div>
              </div>

              <div className="curator-controls-bottom-row">
                <div className="curator-sort-controls-enhanced">
                  <div className="curator-sort-group">
                    <label className="curator-sort-label">Сортировка:</label>
                    <select 
                      className="curator-filter-select-enhanced curator-sort-select" 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="group">По номеру группы</option>
                      <option value="course">По курсу</option>
                      <option value="specialty">По специальности</option>
                      <option value="students">По кол-ву студентов</option>
                      <option value="attendance">По посещаемости</option>
                      <option value="performance">По успеваемости</option>
                    </select>
                    <div className="curator-sort-buttons">
                      <button 
                        className="curator-sort-order-btn"
                        onClick={toggleSortOrder}
                        title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
                      >
                        <img className="curator-sort-order-icon"
                          src={sortOrder === 'asc' ? "/social-icons/sort_asc_icon.svg" : "/social-icons/sort_desc_icon.svg"} 
                          alt="Направление сортировки" 
                        />
                        <span>{sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="curator-course-filter-right">
                  <label className="curator-filter-label">Курс</label>
                  <select 
                    className="curator-filter-select-enhanced curator-course-select" 
                    value={courseFilter} 
                    onChange={(e) => setCourseFilter(e.target.value)}
                  >
                    <option value="all">Все курсы</option>
                    <option value="1">1 курс</option>
                    <option value="2">2 курс</option>
                    <option value="3">3 курс</option>
                    <option value="4">4 курс</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="curator-content-section">
            <div className="curator-section-header">
              <h4>Кураторские группы</h4>
              {groups.length > 0 && (
                <div className="curator-groups-count">
                  <img src="/social-icons/filter_icon.svg" alt="Фильтр" />
                  <span>Показано: <strong>{filteredGroups.length}</strong> из <strong>{groups.length}</strong></span>
                </div>
              )}
            </div>

            {loading ? (
              <div className="curator-loading">
                <div className="curator-loading-spinner"></div>
                <p>Загрузка групп...</p>
              </div>
            ) : groups.length === 0 ? (
              renderEmptyState()
            ) : filteredGroups.length === 0 ? (
              <div className="curator-empty-state">
                <p>Группы не найдены</p>
                <p className="curator-empty-subtitle">Попробуйте изменить параметры поиска или фильтры</p>
              </div>
            ) : (
              <>
                {viewMode === 'cards' && (
                  <div className="curator-groups-cards-container">
                    <div className="curator-groups-cards">
                      {filteredGroups.map((group) => renderGroupCard(group))}
                    </div>
                  </div>
                )}

                {viewMode === 'list' && (
                  <div className="curator-groups-list-container">
                    <div className="curator-groups-list">
                      {filteredGroups.map((group, index) => renderGroupListItem(group, index))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};