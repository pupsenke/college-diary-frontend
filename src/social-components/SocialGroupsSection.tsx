import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './SocialGroupsSection.css';
import { socialApiService } from '../services/socialApiService';

interface GroupData {
  id: number;
  number: string;
  specialty: string;
  course: number;
  studentsCount: number;
  performance: number;
  attendance: number;
  headman: string[];
  curator: string[];
  categories: Record<string, number>;
}

interface StudentData {
  id: number;
  name: string;
  gender: 'М' | 'Ж';
  birthDate: string;
  age: number | null;
  education: string;
  address: string;
  phone: string;
  email: string;
  categories: string[];
  socialCategoryDetails: {
    categoryName: string;
    categoryData: Record<string, string>;
  }[];
}

interface CategoryStats {
  name: string;
  count: number;
  percentage: number;
}

interface CourseStats {
  course: number;
  groups: number;
  students: number;
  performance: number;
  attendance: number;
}

interface ExtendedStats {
  totalStudents: number;
  totalGroups: number;
  riskGroups: number;
  avgPerformance: number;
  avgAttendance: number;
  byCourse: CourseStats[];
  topCategories: CategoryStats[];
}

interface GroupStats {
  studentsCount: number;
  averageGrade: number;
  attendancePercentage: number;
  leadersFio: string | string[];
  curatorFio: string | string[];
}

interface GroupCategoryStat {
  id: number;
  name: string;
  count: number;
}

const formatDate = (isoDate: string | null): string => {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
};

const detectGender = (patronymic: string | null): 'М' | 'Ж' => {
  if (!patronymic) return 'М';
  const lower = patronymic.toLowerCase();
  if (lower.endsWith('на')) return 'Ж';
  return 'М';
};

const parseNamesList = (value: string | string[] | null | undefined): string[] => {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];

  return arr.flatMap(item => {
    if (item.includes(',')) {
      return item.split(',').map(s => s.trim()).filter(Boolean);
    }
    return item.trim() ? [item.trim()] : [];
  });
};

// Форматирование ФИО в формат "Фамилия И.О."
const formatFioShort = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const [lastName, firstName, patronymic] = parts;
  const firstInitial = firstName ? `${firstName[0]}.` : '';
  const patronymicInitial = patronymic ? `${patronymic[0]}.` : '';
  return `${lastName} ${firstInitial}${patronymicInitial}`.trim();
};

// === ЦВЕТА ДЛЯ СОЦИАЛЬНЫХ КАТЕГОРИЙ (синяя палитра) ===
const CATEGORY_COLORS = [
  { bg: '#bfdbfe', text: '#000000' }, // blue-200
  { bg: '#93c5fd', text: '#000000' }, // blue-300
  { bg: '#60a5fa', text: '#000000' }, // blue-400
  { bg: '#3b82f6', text: '#ffffff' }, // blue-500
  { bg: '#2563eb', text: '#ffffff' }, // blue-600
  { bg: '#1d4ed8', text: '#ffffff' }, // blue-700
  { bg: '#1e40af', text: '#ffffff' }, // blue-800
  { bg: '#1e3a8a', text: '#ffffff' }, // blue-900
  { bg: '#172554', text: '#ffffff' }, // blue-950
];

const getCategoryStyle = (categoryName: string, allCategories: string[]): { background: string; color: string } => {
  const index = allCategories.indexOf(categoryName);
  if (index === -1) return { background: '#bfdbfe', color: '#000000' };
  const colorSet = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  return { background: colorSet.bg, color: colorSet.text };
};

export const GroupsSection: React.FC = () => {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [studentsData, setStudentsData] = useState<Record<number, StudentData[]>>({});
  const [socialCategories, setSocialCategories] = useState<string[]>([]);

  const [isUsingCache, setIsUsingCache] = useState(false);
  const [showCacheWarning, setShowCacheWarning] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const [filteredGroups, setFilteredGroups] = useState<GroupData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('group');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [showGroupDetail, setShowGroupDetail] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [expandedStudents, setExpandedStudents] = useState<Set<number>>(new Set());
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const [stats, setStats] = useState<ExtendedStats>({
    totalStudents: 0,
    totalGroups: 0,
    riskGroups: 0,
    avgPerformance: 0,
    avgAttendance: 0,
    byCourse: [],
    topCategories: []
  });

  const specialties = useMemo(() =>
    Array.from(new Set(groups.map(group => group.specialty))),
    [groups]
  );

  const filteredStudentsByCategory = useMemo(() => {
    if (!selectedGroup) return [];

    return (studentsData[selectedGroup.id] || [])
      .filter(s => {
        if (!studentSearchTerm) return true;
        return s.name.toLowerCase().includes(studentSearchTerm.toLowerCase());
      })
      .filter(s => {
        if (selectedCategories.size === 0) return true;
        return s.categories.some(cat => selectedCategories.has(cat));
      });
  }, [selectedGroup, selectedCategories, studentsData, studentSearchTerm]);

  const handleCategoryClick = useCallback((category: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const toggleSortOrder = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

  const handleGroupClick = useCallback(async (group: GroupData) => {
    setSelectedGroup(group);
    setShowGroupDetail(true);
    setSelectedCategories(new Set());
    setStudentSearchTerm('');

    if (!studentsData[group.id]) {
      try {
        const performances = await socialApiService.getStudentsPerformance(group.id);
        const groupCategoryStats = await socialApiService.getGroupCategoryStats(group.id);
        const allSocialCats = await socialApiService.getAllSocialCategories();
        
        const catIdToName: Record<number, string> = {};
        allSocialCats.forEach(c => { catIdToName[c.id] = c.name; });

        const categoryStudentsMap: Record<number, Set<number>> = {};

        await Promise.all(
          groupCategoryStats.map(async (catStat) => {
            try {
              const studentsInCat = await socialApiService.getStudentsInCategory(group.id, catStat.id);
              // ДЕДУПЛИКАЦИЯ уже выполняется в getStudentsInCategory
              categoryStudentsMap[catStat.id] = new Set(studentsInCat.map(s => s.id));
            } catch (e) {
              console.warn(`Failed to load students for category ${catStat.id}:`, e);
              categoryStudentsMap[catStat.id] = new Set();
            }
          })
        );

        const enrichedStudents: StudentData[] = await Promise.all(
          performances.map(async (perf) => {
            const detail = await socialApiService.getStudentById(perf.id);
            const fullDetails = await socialApiService.getStudentFullDetails(perf.id);

            // ДЕДУПЛИКАЦИЯ социальных категорий студента
            let socialCategoryDetails: StudentData['socialCategoryDetails'] = [];
            if (fullDetails?.socialCategories) {
              const uniqueSocialCats = new Map();
              fullDetails.socialCategories.forEach(sc => {
                if (!uniqueSocialCats.has(sc.categoryName)) {
                  uniqueSocialCats.set(sc.categoryName, sc);
                }
              });
              
              socialCategoryDetails = Array.from(uniqueSocialCats.values()).map(sc => {
                let parsedData: Record<string, string> = {};
                try {
                  if (typeof sc.categoryData === 'string' && sc.categoryData !== '{}' && sc.categoryData.trim() !== '') {
                    parsedData = JSON.parse(sc.categoryData);
                  }
                } catch (e) {
                  console.warn(`Parse error for student ${perf.id}, cat ${sc.categoryName}:`, e);
                }
                return {
                  categoryName: sc.categoryName,
                  categoryData: parsedData
                };
              });
            }

            const studentCats: string[] = [];
            for (const catStat of groupCategoryStats) {
              const studentIdsInCat = categoryStudentsMap[catStat.id];
              if (studentIdsInCat && studentIdsInCat.has(perf.id)) {
                const categoryName = catIdToName[catStat.id] || catStat.name;
                studentCats.push(categoryName);
              }
            }

            // ФОРМАТИРОВАНИЕ ДАТЫ РОЖДЕНИЯ
            const formatDateForDisplay = (dateStr: string | null): string => {
              if (!dateStr) return '—';
              if (dateStr.includes('.') && dateStr.split('.').length === 3) {
                return dateStr;
              }
              const parts = dateStr.split('-');
              if (parts.length === 3) {
                return `${parts[2]}.${parts[1]}.${parts[0]}`;
              }
              return dateStr;
            };

            return {
              id: perf.id,
              name: `${perf.lastName} ${perf.firstName} ${perf.patronymic}`,
              gender: detectGender(perf.patronymic),
              birthDate: formatDateForDisplay(detail.birthDate),
              age: socialApiService.calculateAge(detail.birthDate),
              education: detail.educationBasis || '—',
              address: fullDetails?.address || detail.address || '—',
              phone: fullDetails?.telephone || detail.telephone || '—',
              email: fullDetails?.email || detail.email || '—',
              categories: studentCats,
              socialCategoryDetails,
            };
          })
        );

        setStudentsData(prev => ({ ...prev, [group.id]: enrichedStudents }));
      } catch (e) {
        console.error('Ошибка загрузки студентов группы:', e);
      }
    }
  }, [studentsData]);

  const toggleStudentDetails = useCallback((studentId: number) => {
    setExpandedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }, []);

  const fetchGroups = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setShowCacheWarning(false);

      if (forceRefresh) {
        setRefreshing(true);
        socialApiService.invalidateGroupCache();
      }

      const [allGroups, generalStats, byCourse, overallStats, socialCatStats, allSocialCats] = 
        await Promise.all([
          socialApiService.getAllGroups(),
          socialApiService.getGeneralStats(),
          socialApiService.getStatsByCourse(),
          socialApiService.getOverallStats(),
          socialApiService.getSocialCategoriesStats(),
          socialApiService.getAllSocialCategories()
        ]);

      const catNames = allSocialCats.map(c => c.name);
      setSocialCategories(catNames);

      const enrichedGroups: GroupData[] = await Promise.all(
        allGroups.map(async (g) => {
          let groupStats: GroupStats | null = null;
          let catStats: GroupCategoryStat[] = [];

          try {
            [groupStats, catStats] = await Promise.all([
              socialApiService.getGroupStats(g.id),
              socialApiService.getGroupCategoryStats(g.id)
            ]);
          } catch (e) {
            console.warn(`Нет статистики для группы ${g.id} (${g.numberGroup}):`, e);
          }

          const categories: Record<string, number> = {};
          catNames.forEach(name => { categories[name] = 0; });

          if (catStats) {
            catStats.forEach(cs => { categories[cs.name] = cs.count; });
          }

          return {
            id: g.id,
            number: String(g.numberGroup),
            specialty: g.specialty,
            course: g.course,
            studentsCount: groupStats?.studentsCount ?? 0,
            performance: groupStats ? Math.round(groupStats.averageGrade * 10) / 10 : 0,
            attendance: groupStats ? Math.round(groupStats.attendancePercentage * 100) / 100 : 0,
            headman: groupStats ? parseNamesList(groupStats.leadersFio) : [],
            curator: groupStats ? parseNamesList(groupStats.curatorFio) : [],
            categories
          };
        })
      );    

      setGroups(enrichedGroups);

      const totalStudents = generalStats.totalStudents;
      const totalGroups = generalStats.totalGroups;
      const riskGroups = enrichedGroups.filter(g => g.performance < 3.0 || g.attendance < 50).length;

      const topCategories: CategoryStats[] = socialCatStats.map(s => ({
        name: s.categoryName,
        count: s.studentsCount,
        percentage: Math.round(s.percentage)
      }));

      const allCourses = [1, 2, 3, 4];
      const byCourseStats: CourseStats[] = allCourses.map(courseNum => {
        const courseGroups = enrichedGroups.filter(g => g.course === courseNum);
        const courseStudents = courseGroups.reduce((sum, g) => sum + g.studentsCount, 0);
        const apiStat = byCourse.find(c => c.course === courseNum);

        return {
          course: courseNum,
          groups: courseGroups.length,
          students: courseStudents,
          performance: apiStat ? Math.round(apiStat.averageGrade * 10) / 10 : 0,
          attendance: apiStat ? Math.round(apiStat.attendancePercentage * 100) / 100 : 0
        };
      });

      setStats({
        totalStudents,
        totalGroups,
        riskGroups,
        avgPerformance: Math.round(overallStats.averageGrade * 10) / 10,
        avgAttendance: Math.round(overallStats.attendancePercentage * 100) / 100,
        byCourse: byCourseStats,
        topCategories
      });

    } catch (err: any) {
      console.error('CRITICAL ERROR:', err);
      const msg = err?.message || '';
      const isNetworkError =
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('Превышено время ожидания') ||
        err?.name === 'TypeError';

      if (isNetworkError) {
        setIsUsingCache(true);
        setShowCacheWarning(true);
        try {
          const cached = localStorage.getItem('cache_social_groups');
          if (cached) setGroups(JSON.parse(cached));
        } catch (e) { /* ignore */ }
      } else {
        setError(`Не удалось загрузить данные групп: ${msg}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    let result = [...groups];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(g =>
        g.number.toLowerCase().includes(term) ||
        g.specialty.toLowerCase().includes(term) ||
        g.curator.some(c => c.toLowerCase().includes(term))
      );
    }

    if (courseFilter !== 'all') {
      result = result.filter(g => g.course.toString() === courseFilter);
    }

    if (specialtyFilter !== 'all') {
      result = result.filter(g => g.specialty === specialtyFilter);
    }

    if (categoryFilter !== 'all') {
      result = result.filter(g => (g.categories[categoryFilter] || 0) > 0);
    }

    result.sort((a, b) => {
      let valueA: string | number, valueB: string | number;
      switch (sortBy) {
        case 'group': valueA = a.number; valueB = b.number; break;
        case 'course': valueA = a.course; valueB = b.course; break;
        case 'specialty': valueA = a.specialty; valueB = b.specialty; break;
        case 'students': valueA = a.studentsCount; valueB = b.studentsCount; break;
        case 'attendance': valueA = a.attendance; valueB = b.attendance; break;
        case 'performance': valueA = a.performance; valueB = b.performance; break;
        default: valueA = a.number; valueB = b.number;
      }
      if (sortOrder === 'asc') return valueA > valueB ? 1 : -1;
      return valueA < valueB ? 1 : -1;
    });

    setFilteredGroups(result);
  }, [groups, searchTerm, courseFilter, specialtyFilter, categoryFilter, sortBy, sortOrder]);

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
              <h3>Социальные группы</h3>
              <p>Здесь отображаются все учебные группы с социальной статистикой.</p>
            </div>
          </div>
          <div className="info-section">
            <h4>Основные возможности</h4>
            <div className="features-grid">
              <div className="feature-item"><span className="feature-icon"></span><span>Просмотр социальной статистики по группам</span></div>
              <div className="feature-item"><span className="feature-icon"></span><span>Фильтрация по социальным категориям</span></div>
              <div className="feature-item"><span className="feature-icon"></span><span>Детальная информация о студентах</span></div>
              <div className="feature-item"><span className="feature-icon"></span><span>Просмотр подробной статистики</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const RefreshButton = () => (
    <button
      className={`header-btn pc-refresh-btn ${refreshing ? 'pc-refreshing' : ''}`}
      onClick={() => fetchGroups(true)}
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

  const StatisticsButton = () => (
    <button className="header-btn" onClick={() => setShowStatistics(true)}>
      <img src="/social-icons/statistics_icon.svg" alt="Статистика" style={{ width: 20, height: 20 }} />
      <span>Статистика</span>
    </button>
  );

  const renderGroupCard = (group: GroupData) => {
    const categoriesCount = Object.values(group.categories).filter(c => c > 0).length;
    return (
      <div key={group.id} className="sg-group-card" onClick={() => handleGroupClick(group)}>
        <div className="sg-card-top">
          <div className="sg-card-group-header">
            <div className="sg-card-group-number">
              <span className="sg-group-number-label">Группа</span>
              <span className="sg-group-number-value">{group.number}</span>
            </div>
            <div className="sg-card-course"><span className="sg-course-label">{group.course} курс</span></div>
          </div>
          <div className="sg-card-specialty"><h4>{group.specialty}</h4></div>
        </div>
        <div className="sg-card-main-info">
          <div className="sg-card-students">
            <span className="sg-students-label">Студентов</span>
            <span className="sg-students-value">{group.studentsCount}</span>
          </div>
          <div className="sg-card-categories">
            <span className="sg-categories-label">Соц. категорий</span>
            <span className="sg-categories-value">{categoriesCount}</span>
          </div>
        </div>
        <div className="sg-card-metrics">
          <div className="sg-card-metric">
            <div className="sg-metric-header">
              <span className="sg-metric-label">Посещаемость</span>
              <span className="sg-metric-value">{group.attendance}%</span>
            </div>
            <div className="sg-metric-progress">
              <div className="sg-metric-progress-fill" style={{ width: `${Math.min(group.attendance, 100)}%`, background: '#002FA7' }}></div>
            </div>
          </div>
          <div className="sg-card-metric">
            <div className="sg-metric-header">
              <span className="sg-metric-label">Успеваемость</span>
              <span className="sg-metric-value">{group.performance}</span>
            </div>
            <div className="sg-metric-progress">
              <div className="sg-metric-progress-fill" style={{ width: `${Math.min((group.performance / 5) * 100, 100)}%`, background: '#002FA7' }}></div>
            </div>
          </div>
        </div>
        <div className="sg-card-responsible">
          <div className="sg-responsible-item">
            <span className="sg-responsible-label">Староста</span>
            <div className="sg-responsible-value" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.headman.length > 0
                ? group.headman.map((h, i) => <div key={i}>{formatFioShort(h)}</div>)
                : <div>—</div>}
            </div>
          </div>
          <div className="sg-responsible-item">
            <span className="sg-responsible-label">Куратор</span>
            <div className="sg-responsible-value" >
              {group.curator[0] ? formatFioShort(group.curator[0]) : '—'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGroupListItem = (group: GroupData) => {
    const categoriesCount = Object.values(group.categories).filter(c => c > 0).length;
    return (
      <div key={group.id} className="sg-group-list-item" onClick={() => handleGroupClick(group)}>
        <div className="sg-list-main">
          <div className="sg-list-header">
            <div className="sg-list-group-info">
              <span className="sg-list-group-number">{group.number}</span>
              <span className="sg-list-course-badge">{group.course} курс</span>
            </div>
            <div className="sg-list-specialty">{group.specialty}</div>
          </div>
          <div className="sg-list-details">
            <div className="sg-list-detail">
              <span className="sg-detail-label">Студентов:</span>
              <span className="sg-detail-value">{group.studentsCount}</span>
            </div>
            <div className="sg-list-detail">
              <span className="sg-detail-label">Категорий:</span>
              <span className="sg-detail-value">{categoriesCount}</span>
            </div>
            <div className="sg-list-detail">
              <span className="sg-detail-label">Староста:</span>
              <span className="sg-detail-value">
                {group.headman[0] ? formatFioShort(group.headman[0]) : '—'}
              </span>
            </div>
          </div>
        </div>
        <div className="sg-list-metrics">
          <div className="sg-list-metric">
            <div className="sg-list-metric-header">
              <span>П</span>
              <span>{group.attendance}%</span>
            </div>
            <div className="sg-list-progress">
              <div className="sg-list-progress-fill" style={{ width: `${Math.min(group.attendance, 100)}%`, background: '#002FA7' }}></div>
            </div>
          </div>
          <div className="sg-list-metric">
            <div className="sg-list-metric-header">
              <span>У</span>
              <span>{group.performance}</span>
            </div>
            <div className="sg-list-progress">
              <div className="sg-list-progress-fill" style={{ width: `${Math.min((group.performance / 5) * 100, 100)}%`, background: '#002FA7' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StatChart = ({ title, value, max = 100, color = '#002FA7', unit = '%' }: { title: string; value: number; max?: number; color?: string; unit?: string }) => {
    const percentage = Math.min((value / max) * 100, 100);
    return (
      <div className="stat-chart">
        <div className="stat-chart-header">
          <span className="stat-chart-title">{title}</span>
          <span className="stat-chart-value">{value}{unit}</span>
        </div>
        <div className="stat-chart-bar">
          <div className="stat-chart-fill" style={{ width: `${percentage}%`, background: color }}></div>
        </div>
      </div>
    );
  };

  const PieChart = ({ title, data, total }: { title: string; data: { label: string; value: number; color: string }[]; total: number }) => {
    let accumulatedAngle = 0;
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);

    return (
      <div className="pie-chart-container">
        <div className="pie-chart-header">
          <h4 className="pie-chart-title">{title}</h4>
          <div className="pie-chart-total">
            <span className="pie-total-value">{total}</span>
            <span className="pie-total-label">Всего студентов</span>
          </div>
        </div>
        <div className="pie-chart-wrapper">
          <svg className="pie-chart" viewBox="0 0 100 100">
            {data.map((item, index) => {
              const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
              const angle = (percentage / 100) * 360;
              const x1 = 50 + 40 * Math.cos((accumulatedAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((accumulatedAngle * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos(((accumulatedAngle + angle) * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin(((accumulatedAngle + angle) * Math.PI) / 180);
              const largeArcFlag = angle > 180 ? 1 : 0;
              const pathData = [`M 50 50`, `L ${x1} ${y1}`, `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`, `L 50 50`].join(' ');
              accumulatedAngle += angle;
              return (
                <path key={index} d={pathData} fill={item.color} stroke="#fff" strokeWidth="0.5" />
              );
            })}
            {totalValue === 0 && (
              <circle cx="50" cy="50" r="40" fill="#e2e8f0" />
            )}
          </svg>
        </div>
        <div className="pie-chart-legend">
          {data.map((item, index) => (
            <div key={index} className="pie-legend-item">
              <div className="pie-legend-color" style={{ background: item.color }}></div>
              <span className="pie-legend-label">{item.label}</span>
              <span className="pie-legend-value">{item.value} ({Math.round((totalValue > 0 ? item.value / totalValue : 0) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const LineChart = ({ title, data, color = '#002FA7', unit = '%' }: { title: string; data: { label: string; value: number }[]; color?: string; unit?: string }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
      <div className="line-chart-container">
        <h4 className="line-chart-title">{title}</h4>
        <div className="line-chart-wrapper">
          <svg className="line-chart" viewBox="0 0 100 50">
            {[0, 25, 50, 75, 100].map((y, i) => (
              <line key={i} x1="0" y1={y} x2="100" y2={y} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2,2" />
            ))}
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              points={data.map((d, i) => {
                const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
                const y = 100 - (d.value / maxValue) * 100;
                return `${x},${y}`;
              }).join(' ')}
            />
            {data.map((d, i) => {
              const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
              const y = 100 - (d.value / maxValue) * 100;
              return <circle key={i} cx={x} cy={y} r="2" fill={color} stroke="#fff" strokeWidth="1" />;
            })}
          </svg>
        </div>
        <div className="line-chart-labels">
          {data.map((d, i) => (
            <div key={i} className="line-chart-label">
              <span>{d.label}</span>
              <span className="line-chart-value">{d.value}{unit}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStatisticsModal = () => {
    const performanceByCourse = stats.byCourse.map(c => ({ label: `${c.course} курс`, value: c.performance }));
    const attendanceByCourse = stats.byCourse.map(c => ({ label: `${c.course} курс`, value: c.attendance }));

    const categoryColors = [
      '#1e3a5f', '#2e5984', '#4a7fb5', '#6b9bd1',
      '#8ab6d6', '#5a6c7d', '#7a8fa3', '#9ab0c4'
    ];

    const categoryDistribution = stats.topCategories.map((cat, idx) => ({
      label: cat.name,
      value: cat.count,
      color: categoryColors[idx % categoryColors.length]
    }));

    // ИЗМЕНЕНО: сумма студентов по всем социальным категориям (не все студенты)
    const totalInCategories = stats.topCategories.reduce((sum, cat) => sum + cat.count, 0);

    return (
      <div className="pc-modal-overlay" onClick={() => setShowStatistics(false)}>
        <div className="pc-modal pc-modal-lg" onClick={e => e.stopPropagation()}>
          <div className="pc-modal-header">
            <div className="pc-modal-header-content">
              <div className="pc-modal-icon"><img src="/social-icons/statistics_icon.svg" alt="Статистика" /></div>
              <div>
                <h3>Статистика социального сопровождения</h3>
                <p className="pc-modal-subtitle">Обзор ключевых показателей и тенденций</p>
              </div>
            </div>
            <button className="pc-modal-close" onClick={() => setShowStatistics(false)}>×</button>
          </div>
          <div className="pc-modal-content">
            <div className="sg-stats-overview">
              <div className="sg-stats-grid">
                <div className="sg-stat-card-lg">
                  <div className="sg-stat-icon-lg"><img src="/social-icons/all_groups_icon.svg" alt="Группы" /></div>
                  <div className="sg-stat-info-lg"><h3>{stats.totalGroups}</h3><p>Всего групп</p></div>
                </div>
                <div className="sg-stat-card-lg">
                  <div className="sg-stat-icon-lg"><img src="/social-icons/students_icon.svg" alt="Студенты" /></div>
                  <div className="sg-stat-info-lg"><h3>{stats.totalStudents}</h3><p>Всего студентов</p></div>
                </div>
              </div>
              <div className="sg-stats-section">
                <div className="sg-section-header">
                  <h4><img src="/social-icons/performance_icon.svg" alt="Успеваемость" className="sg-performance-icon" /> Ключевые показатели</h4>
                  <span className="sg-section-subtitle">Средние значения по всем группам</span>
                </div>
                <div className="sg-key-metrics-grid">
                  <div className="sg-key-metric"><StatChart value={stats.avgPerformance} title="Средняя успеваемость" color="#002FA7" unit="" max={5} /></div>
                  <div className="sg-key-metric"><StatChart value={stats.avgAttendance} title="Средняя посещаемость" color="#1A4FBF" /></div>
                </div>
              </div>
              <div className="sg-stats-section">
                <div className="sg-section-header">
                  <h4><img src="/social-icons/trend_icon.svg" alt="Тренды" className="sg-performance-icon" /> Динамика по курсам</h4>
                  <span className="sg-section-subtitle">Сравнение показателей по курсам обучения</span>
                </div>
                <div className="sg-charts-grid">
                  <div className="sg-chart-container"><LineChart title="Успеваемость по курсам" data={performanceByCourse} color="#002FA7" unit="" /></div>
                  <div className="sg-chart-container"><LineChart title="Посещаемость по курсам" data={attendanceByCourse} color="#1A4FBF" /></div>
                </div>
              </div>
              <div className="sg-stats-section">
                <div className="sg-section-header">
                  <h4><img src="/social-icons/distribution_icon.svg" alt="Распределение" className="sg-performance-icon" /> Распределение по социальным категориям</h4>
                  <span className="sg-section-subtitle">Количественное распределение студентов по категориям</span>
                </div>
                <div className="sg-pie-chart-container">
                  <PieChart 
                    title="Социальные категории" 
                    data={categoryDistribution} 
                    total={totalInCategories}  // ← ИЗМЕНЕНО: только студенты в категориях
                  />
                </div>
              </div>
              <div className="sg-stats-section">
                <div className="sg-section-header">
                  <h4><img src="/social-icons/courses_icon.svg" alt="Курсы" className="sg-performance-icon" /> Детальная статистика по курсам</h4>
                  <span className="sg-section-subtitle">Подробные показатели для каждого курса</span>
                </div>
                <div className="sg-courses-detailed">
                  {stats.byCourse.map(courseStat => (
                    <div key={courseStat.course} className="sg-course-detailed">
                      <div className="sg-course-detailed-header">
                        <div className="sg-course-title">
                          <h5>{courseStat.course} курс</h5>
                          <span className="sg-course-subtitle">{courseStat.groups} групп • {courseStat.students} студентов</span>
                        </div>
                      </div>
                      <div className="sg-course-metrics">
                        <div className="sg-course-metric">
                          <span>Успеваемость</span>
                          <div className="sg-progress-group">
                            <div className="sg-progress-bar">
                              <div className="sg-progress-fill" style={{ width: `${Math.min((courseStat.performance / 5) * 100, 100)}%`, background: '#002FA7' }}></div>
                            </div>
                            <span className="sg-percent">{courseStat.performance}</span>
                          </div>
                        </div>
                        <div className="sg-course-metric">
                          <span>Посещаемость</span>
                          <div className="sg-progress-group">
                            <div className="sg-progress-bar">
                              <div className="sg-progress-fill" style={{ width: `${Math.min(courseStat.attendance, 100)}%`, background: '#1A4FBF' }}></div>
                            </div>
                            <span className="sg-percent">{courseStat.attendance}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="pc-modal-actions">
              <button className="pc-btn-secondary" onClick={() => setShowStatistics(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

 const renderGroupDetailModal = () => {
  if (!selectedGroup) return null;

  const filteredStudents = filteredStudentsByCategory;

  return (
    <div className="pc-modal-overlay" onClick={() => { setShowGroupDetail(false); setSelectedCategories(new Set()); }}>
      <div className="pc-modal pc-modal-xl" onClick={e => e.stopPropagation()}>
        <div className="pc-modal-header">
          <div className="pc-modal-header-content">
            <div className="pc-modal-icon"><img src="/social-icons/all_groups_icon.svg" alt="Группа" /></div>
            <div>
              <h3>Группа {selectedGroup.number}</h3>
              <p className="pc-modal-subtitle">{selectedGroup.specialty} • {selectedGroup.course} курс</p>
            </div>
          </div>
          <button className="pc-modal-close" onClick={() => { setShowGroupDetail(false); setSelectedCategories(new Set()); }}>×</button>
        </div>
        <div className="pc-modal-content">
          <div className="sg-group-detail-info">
            <div className="sg-group-details-grid">
              <div className="sg-responsible-section">
                <h4><img src="/social-icons/responsible_icon.svg" alt="Ответственные" className="sg-performance-icon" /> Ответственные</h4>
                <div className="sg-responsible-cards">
                  <div className="sg-responsible-card">
                    <div className="sg-responsible-info">
                      <h5>Староста группы</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {selectedGroup.headman.length > 0 ? (
                          selectedGroup.headman.map((h, i) => (
                            <div key={i} className="sg-responsible-name">{h}</div>
                          ))
                        ) : (
                          <div className="sg-responsible-name">—</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="sg-responsible-card">
                    <div className="sg-responsible-info">
                      <h5>Куратор группы</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedGroup.curator.length > 0 ? (
                          selectedGroup.curator.map((c, i) => (
                            <div key={i} className="sg-responsible-name" style={{ display: 'block' }}>
                              {c}
                            </div>
                          ))
                        ) : (
                          <div className="sg-responsible-name" style={{ display: 'block' }}>—</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sg-performance-section">
                <h4><img src="/social-icons/performance_icon.svg" alt="Показатели" className="sg-performance-icon" /> Ключевые показатели</h4>
                <div className="sg-performance-cards">
                  <div className="sg-performance-card">
                    <div className="sg-performance-header">
                      <span>Успеваемость</span>
                      <span className="sg-performance-value">{selectedGroup.performance}</span>
                    </div>
                    <div className="sg-progress-bar-lg">
                      <div className="sg-progress-fill-lg" style={{ width: `${Math.min((selectedGroup.performance / 5) * 100, 100)}%`, background: '#002FA7' }}></div>
                    </div>
                  </div>
                  <div className="sg-performance-card">
                    <div className="sg-performance-header">
                      <span>Посещаемость</span>
                      <span className="sg-performance-value">{selectedGroup.attendance}%</span>
                    </div>
                    <div className="sg-progress-bar-lg">
                      <div className="sg-progress-fill-lg" style={{ width: `${Math.min(selectedGroup.attendance, 100)}%`, background: '#1A4FBF' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sg-group-section">
              <div className="sg-section-header">
                <h4>
                  <img src="/social-icons/categories_icon.svg" alt="Категории" className="sg-performance-icon" />
                  Социальные категории
                </h4>
                <span className="sg-section-subtitle">
                  {selectedCategories.size > 0
                    ? `Выбрано: ${selectedCategories.size} | Показано студентов: ${filteredStudents.length}`
                    : 'Нажмите для фильтрации студентов'}
                </span>
              </div>

              <div className="sg-categories-detailed">
                {Object.entries(selectedGroup.categories)
                  .filter(([_, count]) => count > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat]) => {
                    const isSelected = selectedCategories.has(cat);
                    const style = getCategoryStyle(cat, socialCategories);

                    return (
                      <div
                        key={cat}
                        className={`sg-category-detailed ${isSelected ? 'sg-category-selected' : ''}`}
                        onClick={() => handleCategoryClick(cat)}
                        title={cat}
                      >
                        <div className="sg-category-header">
                          <div
                            className="sg-category-color"
                            style={{
                              background: style.background,
                              boxShadow: isSelected ? `0 0 0 2px white, 0 0 0 4px ${style.background}` : 'none'
                            }}
                          >
                            {isSelected && <span className="sg-category-check">✓</span>}
                          </div>
                          <span className="sg-category-name" style={{ color: isSelected ? '#002FA7' : '#1e293b' }}>{cat}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {selectedCategories.size > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedCategories(new Set())}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: 'transparent',
                      border: '1px dashed #94a3b8',
                      color: '#64748b',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Сбросить все
                  </button>
                </div>
              )}
            </div>

            {/* === СТУДЕНТЫ === */}
            <div className="sg-group-section">
              <div className="sg-section-header">
                <div>
                  <h4><img src="/social-icons/courses_icon.svg" alt="Студенты" className="sg-performance-icon" /> Студенты группы</h4>
                  <span className="sg-section-subtitle">
                    {selectedCategories.size > 0
                      ? `Показаны студенты из выбранных категорий: ${filteredStudents.length} из ${studentsData[selectedGroup.id]?.length || 0}`
                      : `Всего студентов: ${studentsData[selectedGroup.id]?.length || 0}`}
                  </span>
                </div>
              </div>

              <div className="sg-search-box-enhanced" style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Поиск по ФИО студента..."
                  value={studentSearchTerm}
                  onChange={e => setStudentSearchTerm(e.target.value)}
                  className="sg-search-input-enhanced"
                />
                <div className="sg-search-icon">
                  <img src="/social-icons/search_icon.svg" alt="Поиск" />
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="sg-empty-state">
                  <p>{selectedCategories.size > 0 || studentSearchTerm ? 'Студенты не найдены' : 'Студенты не найдены'}</p>
                  {(selectedCategories.size > 0 || studentSearchTerm) && (
                    <button className="sg-clear-filter-btn" onClick={() => { setSelectedCategories(new Set()); setStudentSearchTerm(''); }}>Сбросить фильтр</button>
                  )}
                </div>
              ) : (
                <div className="sg-students-list-compact">
                  {filteredStudents.map(student => {
                    const isExpanded = expandedStudents.has(student.id);
                    return (
                      <div key={student.id} className="sg-student-card-compact">
                        <div className="sg-student-card-border">
                          <div className="sg-student-main-info">
                            <div className="sg-student-basic">
                              <h5>{student.name}</h5>
                              <div className="sg-student-meta">
                                <span className="sg-student-gender">{student.gender}</span>
                                <span className="sg-student-divider">•</span>
                                <span className="sg-student-birth">
                                  {student.birthDate}{student.age !== null ? ` (${student.age} лет)` : ''}
                                </span>
                                <span className="sg-student-divider">•</span>
                                <span className="sg-student-phone">{student.phone}</span>
                                <span className="sg-student-divider">•</span>
                                <span className="sg-student-email">{student.email}</span>
                              </div>
                            </div>
                            <div className="sg-student-actions-compact">
                              <button
                                className="sg-toggle-details-compact"
                                onClick={e => { e.stopPropagation(); toggleStudentDetails(student.id); }}
                              >
                                {isExpanded ? 'Скрыть' : 'Подробнее'}
                              </button>
                            </div>
                          </div>

                          {/* Плашки категорий студента */}
                          {student.categories && student.categories.length > 0 && (
                            <div className="sg-student-categories-compact">
                              {student.categories.map((cat) => {
                                const isSelected = selectedCategories.has(cat);
                                const style = getCategoryStyle(cat, socialCategories);
                                return (
                                  <span
                                    key={cat}
                                    className={`sg-student-category-compact ${isSelected ? 'sg-student-category-selected' : ''}`}
                                    onClick={e => { e.stopPropagation(); handleCategoryClick(cat); }}
                                    style={{
                                      background: style.background,
                                      color: style.color,
                                      border: isSelected ? '2px solid white' : 'none',
                                      boxShadow: isSelected ? `0 0 0 2px ${style.background}` : 'none'
                                    }}
                                  >
                                    {cat}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Если категорий нет — показываем сообщение */}
                          {(!student.categories || student.categories.length === 0) && (
                            <div style={{ 
                              padding: '6px 10px', 
                              background: '#f1f5f9', 
                              borderRadius: '6px', 
                              fontSize: '12px', 
                              color: '#94a3b8',
                              marginBottom: '8px',
                              display: 'inline-block'
                            }}>
                              Нет социальных категорий
                            </div>
                          )}

                          {isExpanded && (
                            <div className="sg-student-details-compact">
                              <div className="sg-details-grid">
                                <div className="sg-detail-row">
                                  <span className="sg-detail-label">Адрес:</span>
                                  <span className="sg-detail-value">{student.address}</span>
                                </div>
                                <div className="sg-detail-row">
                                  <span className="sg-detail-label">Основа обучения:</span>
                                  <span className="sg-detail-value">{student.education}</span>
                                </div>

                                {student.socialCategoryDetails && student.socialCategoryDetails.length > 0 && (
                                  <div className="sg-detail-row" style={{ marginTop: '8px' }}>
                                    <span className="sg-detail-label">Данные по социальным категориям:</span>
                                    <div className="sg-detail-value" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      {student.socialCategoryDetails.map((detail, idx) => {
                                        const style = getCategoryStyle(detail.categoryName, socialCategories);
                                        const hasData = detail.categoryData && Object.keys(detail.categoryData).length > 0;

                                        return (
                                          <div key={idx} style={{ 
                                            border: '1px solid #e2e8f0', 
                                            borderRadius: '8px', 
                                            padding: '10px 12px',
                                            background: '#f8fafc'
                                          }}>
                                            <div style={{ 
                                              display: 'inline-block',
                                              padding: '3px 10px', 
                                              borderRadius: '6px', 
                                              background: style.background, 
                                              color: style.color,
                                              fontSize: '13px',
                                              fontWeight: 600,
                                              marginBottom: hasData ? '8px' : '0'
                                            }}>
                                              {detail.categoryName}
                                            </div>
                                            {hasData && (
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {Object.entries(detail.categoryData).map(([key, value]) => (
                                                  <div key={key} style={{ fontSize: '13px', color: '#334155', lineHeight: '1.4' }}>
                                                    <span style={{ fontWeight: 500, color: '#475569' }}>{key}:</span>{' '}
                                                    <span>{value}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="pc-modal-actions">
            <button className="pc-btn-secondary" onClick={() => { setShowGroupDetail(false); setSelectedCategories(new Set()); }}>Закрыть</button>
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="sg-groups-section">
      <div className="sg-cabinet-header">
        <InfoIcon />
        <div className="sg-header-actions">
          <StatisticsButton />
          <RefreshButton />
        </div>
      </div>

      {showCacheWarning && (
        <div className="sg-cache-warning">
          <span>Используются кэшированные данные. Обновите данные для получения актуальной информации.</span>
        </div>
      )}

      {error && (
        <div className="sg-error-message">
          <span>{error}</span>
        </div>
      )}

      <div className="sg-control-panel-enhanced">
        <div className="sg-controls-top-row">
          <div className="sg-search-box-enhanced">
            <input
              type="text"
              placeholder="Поиск по номеру группы, специальности или куратору..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="sg-search-input-enhanced"
            />
            <div className="sg-search-icon"><img src="/social-icons/search_icon.svg" alt="Поиск" /></div>
          </div>
          <div className="sg-view-toggle">
            <button className={`sg-view-btn ${viewMode === 'cards' ? 'sg-view-active' : ''}`} onClick={() => setViewMode('cards')} title="Карточки">
              <img src="/social-icons/cards_icon.svg" alt="Карточки" /><span>Карточки</span>
            </button>
            <button className={`sg-view-btn ${viewMode === 'list' ? 'sg-view-active' : ''}`} onClick={() => setViewMode('list')} title="Список">
              <img src="/social-icons/list_icon.svg" alt="Список" /><span>Список</span>
            </button>
          </div>
        </div>

        <div className="sg-controls-middle-row">
          <div className="sg-filters-grid">
            <div className="sg-filter-group sg-course-filter">
              <label className="sg-filter-label">Курс</label>
              <select className="sg-filter-select-enhanced sg-course-select" value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
                <option value="all">Все курсы</option>
                <option value="1">1 курс</option>
                <option value="2">2 курс</option>
                <option value="3">3 курс</option>
                <option value="4">4 курс</option>
              </select>
            </div>
            <div className="sg-filter-group sg-specialty-filter">
              <label className="sg-filter-label">Специальность</label>
              <select className="sg-filter-select-enhanced sg-specialty-select" value={specialtyFilter} onChange={e => setSpecialtyFilter(e.target.value)}>
                <option value="all">Все специальности</option>
                {specialties.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="sg-filter-group sg-category-filter">
              <label className="sg-filter-label">Категория</label>
              <select className="sg-filter-select-enhanced sg-category-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="all">Все категории</option>
                {socialCategories.map(c => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
          </div>
        </div>

        <div className="sg-controls-bottom-row">
          <div className="sg-sort-controls-enhanced">
            <div className="sg-sort-group">
              <label className="sg-sort-label">Сортировка:</label>
              <select className="sg-filter-select-enhanced sg-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="group">По номеру группы</option>
                <option value="course">По курсу</option>
                <option value="specialty">По специальности</option>
                <option value="students">По количеству студентов</option>
                <option value="attendance">По посещаемости</option>
                <option value="performance">По успеваемости</option>
              </select>
              <div className="sg-sort-buttons">
                <button className="sg-sort-order-btn" onClick={toggleSortOrder} title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}>
                  <img className="sg-sort-order-icon" src={sortOrder === 'asc' ? "/social-icons/sort_asc_icon.svg" : "/social-icons/sort_desc_icon.svg"} alt="Направление сортировки" />
                  <span>{sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sg-stats-cards">
        <div className="sg-stat-card">
          <div className="sg-stat-icon"><img src="/social-icons/all_groups_icon.svg" alt="Группы" /></div>
          <div className="sg-stat-info"><h3>{stats.totalGroups}</h3><p>Всего групп</p></div>
        </div>
        <div className="sg-stat-card">
          <div className="sg-stat-icon"><img src="/social-icons/students_icon.svg" alt="Студенты" /></div>
          <div className="sg-stat-info"><h3>{stats.totalStudents}</h3><p>Всего студентов</p></div>
        </div>
      </div>

      <div className="sg-content-section">
        <div className="sg-groups-header">
          <h4>Учебные группы</h4>
          <div className="sg-groups-count">
            <img src="/social-icons/filter_icon.svg" alt="Фильтр" />
            <span>Показано: <strong>{filteredGroups.length}</strong> из <strong>{groups.length}</strong></span>
          </div>
        </div>

        {loading ? (
          <div className="sg-loading">
            <div className="sg-loading-spinner"></div>
            <p>Загрузка групп...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="sg-empty-state">
            <p>Группы не найдены</p>
            <p className="sg-empty-subtitle">Попробуйте изменить параметры поиска или фильтры</p>
          </div>
        ) : (
          <>
            {viewMode === 'cards' && (
              <div className="sg-groups-cards-container">
                <div className="sg-groups-cards">
                  {filteredGroups.map(g => renderGroupCard(g))}
                </div>
              </div>
            )}
            {viewMode === 'list' && (
              <div className="sg-groups-list-container">
                <div className="sg-groups-list">
                  {filteredGroups.map(g => renderGroupListItem(g))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showGroupDetail && renderGroupDetailModal()}
      {showStatistics && renderStatisticsModal()}
    </div>
  );
};