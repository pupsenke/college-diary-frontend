import './ViewSection.css';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { methodistApiService } from '../services/methodistApiService';
import type { ApiGroup, ApiScheduleItem } from '../services/methodistApiService';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const EXPORT_CONFIG = {
  academicYear: '2025-2026',
  semester: 2,
  approvalDate: '2025-09-01',
};

const pairTimeMap: Record<number, string> = {
  1: '8.30-10.10',
  2: '10.20-12.00',
  3: '12.45-14.25',
  4: '14.35-16.15',
  5: '16.25-18.05',
  6: '18.15-19.55',
  7: '20.05-21.45'
};

const weekDaysOrder = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

const formatSingleItem = (item: ApiScheduleItem): string => {
  const teacher = methodistApiService.formatTeacherName(
    item.lastnameTeacher,
    item.nameTeacher,
    item.patronymicTeacher
  );
  const room = methodistApiService.formatRoom(item.room);
  const subgroup = item.subgroup ? `п/г ${item.subgroup}` : '';
  const parts = [item.nameSubject];
  if (subgroup) parts.push(subgroup);
  if (teacher) parts.push(teacher);
  if (room) parts.push(room);
  return parts.join(', ');
};

// нормализация типа недели
const normalizeWeekType = (typeWeek: string | undefined): 'upper' | 'lower' | 'common' => {
  if (!typeWeek) return 'common';
  const lowerType = typeWeek.toLowerCase();
  if (lowerType === 'нижняя') return 'lower';
  if (lowerType === 'верхняя') return 'upper';
  return 'common';
};

// форматирование ячейки с разделением на две строки
const formatCellWithWeekSeparation = (items: ApiScheduleItem[]): { upperContent: string; lowerContent: string; hasSeparation: boolean } => {
  let upperItems: ApiScheduleItem[] = [];
  let lowerItems: ApiScheduleItem[] = [];
  let commonItems: ApiScheduleItem[] = [];
  
  for (const item of items) {
    const weekType = normalizeWeekType(item.typeWeek);
    if (weekType === 'upper') {
      upperItems.push(item);
    } else if (weekType === 'lower') {
      lowerItems.push(item);
    } else {
      commonItems.push(item);
    }
  }
  
  const allUpper = [...commonItems, ...upperItems];
  const allLower = [...commonItems, ...lowerItems];
  
  const upperContent = allUpper.map(formatSingleItem).join('\n');
  const lowerContent = allLower.map(formatSingleItem).join('\n');
  
  const hasSeparation = (upperContent !== '' && lowerContent !== '' && upperContent !== lowerContent);
  
  return { upperContent, lowerContent, hasSeparation };
};

const filterActualSchedule = (items: ApiScheduleItem[]): ApiScheduleItem[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return items.filter(item => {
    if (!item.replacement) return true;
    if (item.dateReplacement) {
      const replacementDate = new Date(item.dateReplacement);
      return replacementDate >= today;
    }
    return false;
  });
};

const groupScheduleByDayAndPair = (items: ApiScheduleItem[]): Map<string, Map<number, ApiScheduleItem[]>> => {
  const result = new Map<string, Map<number, ApiScheduleItem[]>>();
  
  items.forEach(item => {
    const day = item.dayWeek;
    const pair = item.numPair;
    
    if (!result.has(day)) {
      result.set(day, new Map());
    }
    
    const dayMap = result.get(day)!;
    if (!dayMap.has(pair)) {
      dayMap.set(pair, []);
    }
    
    dayMap.get(pair)!.push(item);
  });
  
  return result;
};

const buildScheduleTableData = (
  groupedSchedule: Map<string, Map<number, ApiScheduleItem[]>>
): Array<{ day: string; time: string; upperContent: string; lowerContent: string; hasSeparation: boolean }> => {
  const tableData: Array<{ day: string; time: string; upperContent: string; lowerContent: string; hasSeparation: boolean }> = [];
  
  const allDays = weekDaysOrder;
  const allPairs = new Set<number>();
  groupedSchedule.forEach(dayMap => {
    dayMap.forEach((_, pair) => allPairs.add(pair));
  });
  const pairNumbers = Array.from(allPairs).sort((a, b) => a - b);
  
  for (const day of allDays) {
    const dayMap = groupedSchedule.get(day) || new Map();
    let isFirstRowOfDay = true;
    
    for (const pairNum of pairNumbers) {
      const timeSlot = pairTimeMap[pairNum] || `${pairNum} пара`;
      const items = dayMap.get(pairNum) || [];
      
      if (items.length > 0) {
        const { upperContent, lowerContent, hasSeparation } = formatCellWithWeekSeparation(items);
        
        tableData.push({
          day: isFirstRowOfDay ? day : '',
          time: timeSlot,
          upperContent,
          lowerContent,
          hasSeparation
        });
        isFirstRowOfDay = false;
      } else if (isFirstRowOfDay) {
        // добавление пустой строки если нет пар в какой то день
        tableData.push({
          day: day,
          time: timeSlot,
          upperContent: '',
          lowerContent: '',
          hasSeparation: false
        });
        isFirstRowOfDay = false;
      }
    }
  }
  
  return tableData;
};

// основная функция экспорта
const exportScheduleToExcel = async (groupId: number, groupNumber: string) => {
  try {
    const data = await methodistApiService.getScheduleByGroup(groupId);
    const actualSchedule = filterActualSchedule(data);
    
    if (actualSchedule.length === 0) {
      console.log('Нет занятий для экспорта');
      return;
    }
    
    const groupedSchedule = groupScheduleByDayAndPair(actualSchedule);
    const scheduleTable = buildScheduleTableData(groupedSchedule);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Расписание');
    
    // настройка для колонок
    worksheet.columns = [
      { header: '', key: 'day', width: 14 },
      { header: '', key: 'time', width: 15 },
      { header: '', key: 'subject', width: 65 },
    ];
    
    const headerFont = { name: 'Arial', size: 11, bold: true };
    const normalFont = { name: 'Arial', size: 10 };
    const boldFont = { name: 'Arial', size: 10, bold: true };
    
    // шапка таблицы
    worksheet.mergeCells('C1:C1');
    worksheet.getCell('C1').value = 'УТВЕРЖДАЮ';
    worksheet.getCell('C1').font = headerFont;
    
    worksheet.mergeCells('C2:C2');
    worksheet.getCell('C2').value = 'Директор ПТИ______________В.А.Шульцев';
    worksheet.getCell('C2').font = normalFont;
    
    worksheet.mergeCells('C3:C3');
    worksheet.getCell('C3').value = EXPORT_CONFIG.approvalDate;
    worksheet.getCell('C3').font = normalFont;
    
    worksheet.mergeCells('C4:C4');
    worksheet.getCell('C4').value = 'РАСПИСАНИЕ ЗАНЯТИЙ';
    worksheet.getCell('C4').font = headerFont;
    
    worksheet.mergeCells('C5:C5');
    worksheet.getCell('C5').value = `${EXPORT_CONFIG.academicYear} учебный год, ${EXPORT_CONFIG.semester} семестр`;
    worksheet.getCell('C5').font = normalFont;
    
    worksheet.mergeCells('C6:C6');
    worksheet.getCell('C6').value = '';
    
    worksheet.mergeCells('C7:C7');
    worksheet.getCell('C7').value = groupNumber.toString();
    worksheet.getCell('C7').font = boldFont;
    
    // заполнение таблицы расписанием с восьмой ячейки
    let currentRow = 8;
    
    for (const item of scheduleTable) {
      if (item.hasSeparation) {
        // пары по верхней недели
        const upperRow = worksheet.getRow(currentRow);
        upperRow.getCell(1).value = item.day;
        upperRow.getCell(2).value = item.time;
        upperRow.getCell(3).value = item.upperContent;
        
        for (let col = 1; col <= 3; col++) {
          const cell = upperRow.getCell(col);
          cell.font = normalFont;
          cell.alignment = { vertical: 'top', wrapText: true, horizontal: col === 2 ? 'center' : 'left' };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        }
        
        if (item.day !== '') {
          upperRow.getCell(1).font = boldFont;
        }
        
        currentRow++;
        
        // пары по нижней недели (без дня недели и времени)
        const lowerRow = worksheet.getRow(currentRow);
        lowerRow.getCell(1).value = '';
        lowerRow.getCell(2).value = '';
        lowerRow.getCell(3).value = item.lowerContent;
        
        for (let col = 1; col <= 3; col++) {
          const cell = lowerRow.getCell(col);
          cell.font = normalFont;
          cell.alignment = { vertical: 'top', wrapText: true, horizontal: col === 2 ? 'center' : 'left' };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        }
        
        currentRow++;
      } else {
        // пары по общей неделе (одно занятие или пустое)
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = item.day;
        row.getCell(2).value = item.time;
        row.getCell(3).value = item.upperContent || item.lowerContent;
        
        for (let col = 1; col <= 3; col++) {
          const cell = row.getCell(col);
          cell.font = normalFont;
          cell.alignment = { vertical: 'top', wrapText: true, horizontal: col === 2 ? 'center' : 'left' };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        }
        
        if (item.day !== '') {
          row.getCell(1).font = boldFont;
        }
        
        currentRow++;
      }
    }
    
    const signatureRow = worksheet.getRow(currentRow + 1);
    signatureRow.getCell(3).value = 'Зам. директора по УМ и ВР________Л.Н. Иванова';
    signatureRow.getCell(3).font = normalFont;
    signatureRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    
    // объединение ячеек дня недели по вертикали
    let mergeStartRow = -1;
    let currentDay = '';
    
    for (let r = 8; r < currentRow; r++) {
      const dayCell = worksheet.getRow(r).getCell(1);
      const dayValue = dayCell.value;
      
      if (dayValue && dayValue !== '') {
        if (currentDay !== '' && mergeStartRow !== -1 && r - mergeStartRow > 1) {
          worksheet.mergeCells(`A${mergeStartRow}:A${r - 1}`);
        }
        currentDay = dayValue.toString();
        mergeStartRow = r;
      }
    }
    
    if (mergeStartRow !== -1 && currentRow - 1 > mergeStartRow) {
      worksheet.mergeCells(`A${mergeStartRow}:A${currentRow - 1}`);
    }
    
    // сохранение файла
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${groupNumber}.xlsx`);
  } catch (error) {
    console.error('Ошибка экспорта:', error);
  }
};

export const ViewSectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<number | 'all'>('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [exportingGroupId, setExportingGroupId] = useState<number | null>(null);

  useEffect(() => {
    const loadGroups = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const data = await methodistApiService.getGroups();
        setGroups(data);
      } catch (e: any) {
        console.error(e);
        setLoadError(e.message || 'Не удалось загрузить группы');
      } finally {
        setLoading(false);
      }
    };
    loadGroups();
  }, []);

  const courses = useMemo(() => {
    const set = new Set<number>();
    groups.forEach(g => set.add(g.course));
    return Array.from(set).sort((a, b) => a - b);
  }, [groups]);

  const specialties = useMemo(() => {
    const set = new Set<string>();
    groups.forEach(g => {
      if (g.specialty) set.add(g.specialty);
    });
    return Array.from(set).sort();
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const byCourse = selectedCourse === 'all' ? true : g.course === selectedCourse;
      const bySpecialty = selectedSpecialty === 'all' ? true : g.specialty === selectedSpecialty;
      return byCourse && bySpecialty;
    });
  }, [groups, selectedCourse, selectedSpecialty]);

  const groupedByCourse = useMemo(() => {
    return filteredGroups.reduce((acc, group) => {
      if (!acc[group.course]) {
        acc[group.course] = [];
      }
      acc[group.course].push(group);
      return acc;
    }, {} as Record<number, ApiGroup[]>);
  }, [filteredGroups]);

  const handleBackClick = () => {
    navigate('/metodist');
  };

  const handleEditClick = (groupId: number) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      localStorage.setItem('selectedGroupForEdit', String(group.id));
      navigate('/metodist/edit-schedule');
    }
  };

  const handleViewScheduleClick = (groupId: number) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      localStorage.setItem('selectedGroupForEdit', String(group.id));
      navigate('/metodist/view-groups/view-schedule');
    }
  };

  const handleExportClick = async (groupId: number, groupNumber: string) => {
    setExportingGroupId(groupId);
    await exportScheduleToExcel(groupId, groupNumber);
    setExportingGroupId(null);
  };

  return (
    <div className="md-white-background-vs">
      <main className="view-section-main">
        <div className="header-controls">
          <button className="back-button" onClick={handleBackClick}>
            Назад
          </button>

          <div className="filter-section">
            <select
              id="course-filter"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
              className="course-filter">
              <option value="all">Все курсы</option>
              {courses.map(course => (
                <option key={course} value={course}>
                  {course} курс
                </option>
              ))}
            </select>

            <select
              id="specialty-filter"
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="course-filter">
              <option value="all">Все специальности</option>
              {specialties.map(spec => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <div className="status-banner">Загрузка групп...</div>}
        {loadError && <div className="status-banner error">{loadError}</div>}

        {!loading && !loadError && (
          <div className="groups-container">
            {Object.entries(groupedByCourse)
              .sort(([courseA], [courseB]) => parseInt(courseA, 10) - parseInt(courseB, 10))
              .map(([course, courseGroups]) => (
                <div key={course} className="course-section">
                  <h2 className="course-title">{course} курс</h2>
                  <ul className="v-groups-list">
                    {courseGroups.map(group => (
                      <li key={group.id} className="v-group-item">
                        <div className="group-info">
                          <span className="group-code">{group.numberGroup}</span>
                          <span className="group-name">{group.specialty}</span>
                        </div>
                        <div className="group-actions">
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEditClick(group.id)}
                            title="Редактировать расписание">
                            <img src="/md-icons/edit_icon.svg" alt="Редактировать" className="action-icon"/>
                            <span>Редактировать</span>
                          </button>
                          <button
                            className="action-btn view-btn"
                            onClick={() => handleViewScheduleClick(group.id)}
                            title="Просмотр расписания">
                            <img src="/md-icons/eye_icon.svg" alt="Просмотреть" className="action-icon"/>
                            <span>Просмотр</span>
                          </button>
                          <button
                            className="action-btn export-btn"
                            onClick={() => handleExportClick(group.id, String(group.numberGroup))}
                            disabled={exportingGroupId === group.id}
                            title="Экспорт расписания в Excel">
                            {exportingGroupId === group.id ? (
                              <span className="export-spinner"></span>
                            ) : (
                              <>
                                <img src="/md-icons/download_icon.svg" alt="Экспорт" className="action-icon"/>
                                <span>Экспорт</span>
                              </>
                            )}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  );
};