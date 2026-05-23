import React, { useState, useEffect } from 'react';
import { headApiService } from '../services/headApiService';
import ExcelJS from 'exceljs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import './SummaryStatementSectionStyle.css';

interface Subject {
  id: number;
  name: string;
  assessmentForm: string;
}

interface StudentGrade {
  id: number;
  name: string;
  grades: Map<string, string>;
  average: number;
  behavior: string;
  absencesTotal: number;
  absencesUnjustified: number;
  scholarship: string;
  gradesCount: {
    five: number;
    four: number;
    three: number;
  };
  naSubjects?: Set<string>;
}

interface GroupStatement {
  id: number;
  groupNumber: string;
  specialty: string;
  course: number;
  semester: number;
  academicYear: string;
  formOfStudy: string;
  students: StudentGrade[];
  subjects: Subject[];
  studentsCount?: number;
}

interface GroupReportResponse {
  subjectNames: string[];
  studentsData: StudentReportData[][];
}

interface StudentReportData {
  fio: string;
  marks: number[];
  average: number;
  count_3: number;
  count_4: number;
  count_5: number;
  non_excused: number;
  scholarship: string;
  total_absent: number;
}

interface SummaryStatementSectionProps {
  groupId: number;
  onClose: () => void;
}

interface AttestationFormData {
  attestationForm: string;
  teacherName: string; // Преподаватель, ведущий дисциплину
  headName: string; // Заведующий отделением
  courseworkTopic: string;
  attestationNumber: string;
  attestationDate: string;
  // Поля для комиссии
  commissionTeacher1: string; // Член комиссии №1 (председатель)
  commissionTeacher2: string; // Член комиссии №2
  commissionTeacher3: string; // Член комиссии №3 (опционально)
  commissionDeadline: string;
  regularDeadline: string;
}
// Тип направления
type AttestationType = 'regular' | 'commission';

export const SummaryStatementSection: React.FC<SummaryStatementSectionProps> = ({ groupId, onClose }) => {
  const [groupStatement, setGroupStatement] = useState<GroupStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isNAModalOpen, setIsNAModalOpen] = useState(false);
  const [selectedNAStudent, setSelectedNAStudent] = useState<StudentGrade | null>(null);
  const [selectedNASubject, setSelectedNASubject] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  // Активная вкладка в модальном окне
  const [activeAttestationTab, setActiveAttestationTab] = useState<AttestationType>('regular');

  // Фильтры год и семестр
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedSemester, setSelectedSemester] = useState<number>(7);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const [attestationFormData, setAttestationFormData] = useState<AttestationFormData>({
    attestationForm: 'экзамен',
    teacherName: '',
    headName: 'Голубева Г.А.',
    courseworkTopic: '',
    attestationNumber: '',
    attestationDate: new Date().toISOString().split('T')[0],
    commissionTeacher1: '',
    commissionTeacher2: '',
    commissionTeacher3: '',
    commissionDeadline: '',
    regularDeadline: ''
  });

  const attestationForms = ['зачет', 'дифф. зачет', 'экзамен', 'курсовой проект'];
  const headOptions = ['Голубева Г.А.'];

  // Инициализация доступных годов
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 3; i <= currentYear + 2; i++) {
      years.push(i);
    }
    setAvailableYears(years);
  }, []);

  // Перезагрузка данных при изменении фильтров
  useEffect(() => {
    if (groupId) {
      loadGroupStatement();
    }
  }, [groupId, selectedYear, selectedSemester]);

  // Функция для форматирования среднего балла
  const formatAverageDisplay = (avg: number): string => {
    if (avg === 0 || isNaN(avg)) return '-';
    if (Number.isInteger(avg)) return avg.toString();
    return avg.toFixed(1);
  };

  const handleExportStatement = () => {
    if (!groupStatement) return;
    exportToExcel();
  };

  const getRomanSemester = (sem: number): string => {
    const romanMap: Record<number, string> = { 
      1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 
      6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X' 
    };
    return romanMap[sem] || sem.toString();
  };

  // Функция экспорта в Excel с использованием ExcelJS
  const exportToExcel = async () => {
    if (!groupStatement) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Сводная ведомость');

      const subjectCount = groupStatement.subjects.length;

      // Структура колонок:
      const afterSubjectsStart = 3 + subjectCount;
      const avgCol = afterSubjectsStart;           // Средний балл
      const behaviorCol = afterSubjectsStart + 1;  // Поведение
      const totalAbsentCol = afterSubjectsStart + 2; // Пропуски всего
      const unjustifiedCol = afterSubjectsStart + 3; // в т.ч. неув.
      const scholarshipCol = afterSubjectsStart + 4; // Стипендия
      const gradesStartCol = afterSubjectsStart + 5; // Начало колонок с оценками (5,4,3)

      const lastColIndex = gradesStartCol + 2;
      const lastColLetter = String.fromCharCode(65 + lastColIndex - 1);

      // Вспомогательная функция для создания fill pattern
      const createFill = (color: string): ExcelJS.Fill => ({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: color }
      } as ExcelJS.Fill);

      // === 0. ШАПКА УНИВЕРСИТЕТА ===
      const headerLines = [
        'Министерство науки и высшего образования Российской Федерации',
        'Федеральное государственное бюджетное образовательное учреждение',
        'высшего образования',
        '«Новгородский государственный университет имени Ярослава Мудрого»',
        'ПОЛИТЕХНИЧЕСКИЙ ИНСТИТУТ',
        'ПОЛИТЕХНИЧЕСКИЙ КОЛЛЕДЖ'
      ];

      headerLines.forEach((line, idx) => {
        const rowNum = idx + 1;
        worksheet.mergeCells(`A${rowNum}:${lastColLetter}${rowNum}`);
        const cell = worksheet.getCell(`A${rowNum}`);
        cell.value = line;
        cell.font = { size: 11, name: 'Times New Roman', bold: idx === 3 || idx === 4 || idx === 5 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // === 1. ЗАГОЛОВКИ ВЕДОМОСТИ ===
      const titleRow = 8;

      worksheet.mergeCells(`A${titleRow}:${lastColLetter}${titleRow}`);
      worksheet.getCell(`A${titleRow}`).value = `Сводная аттестационная ведомость на ${groupStatement.academicYear} учебный год   Семестр ${getRomanSemester(groupStatement.semester)}`;
      worksheet.getCell(`A${titleRow}`).font = { size: 12, bold: true, name: 'Times New Roman' };
      worksheet.getCell(`A${titleRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells(`A${titleRow + 1}:${lastColLetter}${titleRow + 1}`);
      worksheet.getCell(`A${titleRow + 1}`).value = `Специальность ${groupStatement.specialty}`;
      worksheet.getCell(`A${titleRow + 1}`).font = { size: 11, name: 'Times New Roman' };
      worksheet.getCell(`A${titleRow + 1}`).alignment = { horizontal: 'left', vertical: 'middle' };

      worksheet.mergeCells(`A${titleRow + 2}:${lastColLetter}${titleRow + 2}`);
      worksheet.getCell(`A${titleRow + 2}`).value = `Курс ${groupStatement.course} Группа ${groupStatement.groupNumber} Форма обучения ${groupStatement.formOfStudy}`;
      worksheet.getCell(`A${titleRow + 2}`).font = { size: 11, name: 'Times New Roman' };
      worksheet.getCell(`A${titleRow + 2}`).alignment = { horizontal: 'left', vertical: 'middle' };

            // === 2. ШАПКА ТАБЛИЦЫ - ПЕРВАЯ СТРОКА (строка 12) ===
      const headerRow1 = titleRow + 4;
      const firstHeaderRow = worksheet.getRow(headerRow1);
      firstHeaderRow.height = 40;

      // Объединяем A12:A13 и B12:B13 (вертикально)
      worksheet.mergeCells(headerRow1, 1, headerRow1 + 1, 1);
      worksheet.mergeCells(headerRow1, 2, headerRow1 + 1, 2);

      firstHeaderRow.getCell(1).value = '№ п/п';
      firstHeaderRow.getCell(2).value = 'Фамилия, имя, отчество студента';

      // Объединение ячеек для дисциплин (только по горизонтали в первой строке)
      worksheet.mergeCells(headerRow1, 3, headerRow1, 2 + subjectCount);
      firstHeaderRow.getCell(3).value = 'Наименование дисциплины (МДК)/ форма аттестации';

      // Кол-во оценок - объединяем 3 колонки
      worksheet.mergeCells(headerRow1, gradesStartCol, headerRow1, gradesStartCol + 2);
      firstHeaderRow.getCell(gradesStartCol).value = 'Кол-во оценок';

      // Стили первой строки заголовка - БЕЗ голубого фона для всех
      for (let i = 1; i <= lastColIndex; i++) {
        const cell = firstHeaderRow.getCell(i);
        cell.font = { color: { argb: 'FF000000' }, bold: true, size: 10, name: 'Times New Roman' };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      }

      // === 3. ШАПКА ТАБЛИЦЫ - ВТОРАЯ СТРОКА (строка 13) ===
      const headerRow2 = headerRow1 + 1;
      const secondHeaderRow = worksheet.getRow(headerRow2);
      secondHeaderRow.height = 200;

      // A13 и B13 уже объединены с A12 и B12, поэтому не нужно их отдельно обрабатывать
      // Но нужно добавить границы для нижней части объединенных ячеек
      const cellA13 = secondHeaderRow.getCell(1);
      cellA13.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      const cellB13 = secondHeaderRow.getCell(2);
      cellB13.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      // Дисциплины с вертикальным текстом - ТОЛЬКО ЗДЕСЬ ГОЛУБОЙ ФОН
      groupStatement.subjects.forEach((subject, idx) => {
        const cell = secondHeaderRow.getCell(3 + idx);
        cell.value = `${subject.name}, ${subject.assessmentForm}`;
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
          textRotation: 90 // Текст перевернут на 90 градусов против часовой стрелки
        };
        cell.fill = createFill('FFDBE5F1'); // ГОЛУБОЙ фон ТОЛЬКО для дисциплин
        cell.font = { color: { argb: 'FF000000' }, bold: true, size: 9, name: 'Times New Roman' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // ВЕРТИКАЛЬНЫЕ ЗАГОЛОВКИ для колонок Средний балл, Поведение и т.д. - БЕЗ голубого фона
      worksheet.mergeCells(headerRow1, avgCol, headerRow2, avgCol);
      const avgHeaderCell = worksheet.getCell(headerRow1, avgCol);
      avgHeaderCell.value = 'Средний балл';
      avgHeaderCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
        textRotation: 90
      };
      avgHeaderCell.font = { color: { argb: 'FF000000' }, bold: true, size: 9, name: 'Times New Roman' };
      avgHeaderCell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      worksheet.mergeCells(headerRow1, behaviorCol, headerRow2, behaviorCol);
      const behaviorHeaderCell = worksheet.getCell(headerRow1, behaviorCol);
      behaviorHeaderCell.value = 'Поведение';
      behaviorHeaderCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
        textRotation: 90
      };
      behaviorHeaderCell.font = { color: { argb: 'FF000000' }, bold: true, size: 9, name: 'Times New Roman' };
      behaviorHeaderCell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      worksheet.mergeCells(headerRow1, totalAbsentCol, headerRow2, totalAbsentCol);
      const totalAbsentHeaderCell = worksheet.getCell(headerRow1, totalAbsentCol);
      totalAbsentHeaderCell.value = 'Пропуски\nзанятий\nвсего / ч.';
      totalAbsentHeaderCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
        textRotation: 90
      };
      totalAbsentHeaderCell.font = { color: { argb: 'FF000000' }, bold: true, size: 9, name: 'Times New Roman' };
      totalAbsentHeaderCell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      worksheet.mergeCells(headerRow1, unjustifiedCol, headerRow2, unjustifiedCol);
      const unjustifiedHeaderCell = worksheet.getCell(headerRow1, unjustifiedCol);
      unjustifiedHeaderCell.value = 'в т. ч. по\nнеуважит.\nпричинам / ч.';
      unjustifiedHeaderCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
        textRotation: 90
      };
      unjustifiedHeaderCell.font = { color: { argb: 'FF000000' }, bold: true, size: 9, name: 'Times New Roman' };
      unjustifiedHeaderCell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      worksheet.mergeCells(headerRow1, scholarshipCol, headerRow2, scholarshipCol);
      const scholarshipHeaderCell = worksheet.getCell(headerRow1, scholarshipCol);
      scholarshipHeaderCell.value = 'Стипендия:';
      scholarshipHeaderCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
        textRotation: 90
      };
      scholarshipHeaderCell.font = { color: { argb: 'FF000000' }, bold: true, size: 9, name: 'Times New Roman' };
      scholarshipHeaderCell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      // Отдельные ячейки 5, 4, 3 - КРАСНЫМ цветом, БЕЗ голубого фона
      const cell5 = secondHeaderRow.getCell(gradesStartCol);
      cell5.value = '"5"';
      cell5.font = { color: { argb: 'FFFF0000' }, bold: true, size: 10, name: 'Times New Roman' };
      cell5.alignment = { horizontal: 'center', vertical: 'middle' };
      cell5.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      const cell4 = secondHeaderRow.getCell(gradesStartCol + 1);
      cell4.value = '"4"';
      cell4.font = { color: { argb: 'FFFF0000' }, bold: true, size: 10, name: 'Times New Roman' };
      cell4.alignment = { horizontal: 'center', vertical: 'middle' };
      cell4.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      const cell3 = secondHeaderRow.getCell(gradesStartCol + 2);
      cell3.value = '"3"';
      cell3.font = { color: { argb: 'FFFF0000' }, bold: true, size: 10, name: 'Times New Roman' };
      cell3.alignment = { horizontal: 'center', vertical: 'middle' };
      cell3.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      // === 4. ДАННЫЕ СТУДЕНТОВ ===
      const dataStartRow = headerRow2 + 1;
      groupStatement.students.forEach((student, idx) => {
        const row = worksheet.getRow(dataStartRow + idx);
        row.height = 18;

        const rowFill: ExcelJS.Fill | undefined = idx % 2 === 0 ? undefined : createFill('FFFFFFFF');

        row.getCell(1).value = idx + 1;
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(1).font = { size: 10, name: 'Times New Roman' };
        row.getCell(1).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        if (rowFill) row.getCell(1).fill = rowFill;

        row.getCell(2).value = student.name;
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(2).font = { size: 10, name: 'Times New Roman' };
        row.getCell(2).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        if (rowFill) row.getCell(2).fill = rowFill;

        // Оценки по предметам
        groupStatement.subjects.forEach((subject, subjIdx) => {
          const subjectKey = `${subject.name}, ${subject.assessmentForm}`;
          const grade = student.grades.get(subjectKey) || '';
          const cell = row.getCell(3 + subjIdx);
          cell.value = grade;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { size: 10, name: 'Times New Roman' };

          if (grade === 'н/а') {
            cell.font = { size: 10, name: 'Times New Roman', color: { argb: 'FFFF0000' } };
          }

          if (student.naSubjects?.has(subjectKey)) {
            cell.fill = createFill('FFe8f4fd');
          } else if (rowFill) {
            cell.fill = rowFill;
          }

          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });

        // Средний балл - синим цветом
        const avgCell = row.getCell(avgCol);
        avgCell.value = student.average;
        avgCell.numFmt = '0.0';
        avgCell.font = { bold: true, size: 10, name: 'Times New Roman' };
        avgCell.alignment = { horizontal: 'center', vertical: 'middle' };
        avgCell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        if (rowFill) avgCell.fill = rowFill;

        // Поведение
        row.getCell(behaviorCol).value = student.behavior;
        row.getCell(behaviorCol).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(behaviorCol).font = { size: 10, name: 'Times New Roman' };
        row.getCell(behaviorCol).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        if (rowFill) row.getCell(behaviorCol).fill = rowFill;

        // Пропуски всего
        row.getCell(totalAbsentCol).value = student.absencesTotal * 2;
        row.getCell(totalAbsentCol).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(totalAbsentCol).font = { size: 10, name: 'Times New Roman' };
        row.getCell(totalAbsentCol).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        if (rowFill) row.getCell(totalAbsentCol).fill = rowFill;

        // Пропуски неуважительные
        row.getCell(unjustifiedCol).value = student.absencesUnjustified * 2;
        row.getCell(unjustifiedCol).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(unjustifiedCol).font = { size: 10, name: 'Times New Roman' };
        row.getCell(unjustifiedCol).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        if (rowFill) row.getCell(unjustifiedCol).fill = rowFill;

        // Стипендия
        row.getCell(scholarshipCol).value = student.scholarship;
        row.getCell(scholarshipCol).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(scholarshipCol).font = { size: 10, name: 'Times New Roman' };
        row.getCell(scholarshipCol).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        if (rowFill) row.getCell(scholarshipCol).fill = rowFill;

        // Оценки 5,4,3 - красным цветом
        row.getCell(gradesStartCol).value = student.gradesCount.five;
        row.getCell(gradesStartCol).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(gradesStartCol).font = { size: 10, name: 'Times New Roman', color: { argb: 'FFFF0000' } };
        row.getCell(gradesStartCol).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        if (rowFill) row.getCell(gradesStartCol).fill = rowFill;

        row.getCell(gradesStartCol + 1).value = student.gradesCount.four;
        row.getCell(gradesStartCol + 1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(gradesStartCol + 1).font = { size: 10, name: 'Times New Roman', color: { argb: 'FFFF0000' } };
        row.getCell(gradesStartCol + 1).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        if (rowFill) row.getCell(gradesStartCol + 1).fill = rowFill;

        row.getCell(gradesStartCol + 2).value = student.gradesCount.three;
        row.getCell(gradesStartCol + 2).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(gradesStartCol + 2).font = { size: 10, name: 'Times New Roman', color: { argb: 'FFFF0000' } };
        row.getCell(gradesStartCol + 2).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        if (rowFill) row.getCell(gradesStartCol + 2).fill = rowFill;
      });

      // === 5. ПОДВАЛ СО СТАТИСТИКОЙ ===
      const footerRowIndex = dataStartRow + groupStatement.students.length;
      const statistics = calculateStatistics();

      const statsStartRow = footerRowIndex;

      const stat1LabelCell = worksheet.getCell(statsStartRow, unjustifiedCol - 1);
      stat1LabelCell.value = `На «5»`;
      stat1LabelCell.font = { size: 10, name: 'Times New Roman' };
      stat1LabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

      const stat1ValCell = worksheet.getCell(statsStartRow, unjustifiedCol);
      stat1ValCell.value = `${statistics.fivesOnly} чел.`;
      stat1ValCell.font = { size: 10, name: 'Times New Roman', color: { argb: 'FF000000' } };
      stat1ValCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const stat2LabelCell = worksheet.getCell(statsStartRow + 1, unjustifiedCol - 1);
      stat2LabelCell.value = `На «4», «5»`;
      stat2LabelCell.font = { size: 10, name: 'Times New Roman' };
      stat2LabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

      const stat2ValCell = worksheet.getCell(statsStartRow + 1, unjustifiedCol);
      stat2ValCell.value = `${statistics.foursAndFives} чел.`;
      stat2ValCell.font = { size: 10, name: 'Times New Roman', color: { argb: 'FF000000' } };
      stat2ValCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const stat3LabelCell = worksheet.getCell(statsStartRow + 2, unjustifiedCol - 1);
      stat3LabelCell.value = `С одной «3»`;
      stat3LabelCell.font = { size: 10, name: 'Times New Roman' };
      stat3LabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

      const stat3ValCell = worksheet.getCell(statsStartRow + 2, unjustifiedCol);
      stat3ValCell.value = `${statistics.hasThree} чел.`;
      stat3ValCell.font = { size: 10, name: 'Times New Roman', color: { argb: 'FF000000' } };
      stat3ValCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const stat4LabelCell = worksheet.getCell(statsStartRow + 3, unjustifiedCol - 1);
      stat4LabelCell.value = `н/а`;
      stat4LabelCell.font = { size: 10, name: 'Times New Roman' };
      stat4LabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

      const stat4ValCell = worksheet.getCell(statsStartRow + 3, unjustifiedCol);
      stat4ValCell.value = `${statistics.naCount} чел.`;
      stat4ValCell.font = { size: 10, name: 'Times New Roman', color: { argb: 'FF000000' } };
      stat4ValCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // === 6. ПОДПИСИ (одной строкой) ===
      const signRow = statsStartRow + 5;

      worksheet.mergeCells(signRow, 1, signRow, 7); 
      worksheet.getCell(signRow, 1).value = 'Куратор ________________ /Г. А. Голубева/';
      worksheet.getCell(signRow, 1).font = { size: 11, name: 'Times New Roman' };
      worksheet.getCell(signRow, 1).alignment = { horizontal: 'left', vertical: 'middle' };

      worksheet.mergeCells(signRow + 1, 1, signRow + 1, 7);
      worksheet.getCell(signRow + 1, 1).value = 'Зам. директора по УМ и ВР/ зав.отделением / зав.уч.частью ____________ /Г. А. Голубева/';
      worksheet.getCell(signRow + 1, 1).font = { size: 11, name: 'Times New Roman' };
      worksheet.getCell(signRow + 1, 1).alignment = { horizontal: 'left', vertical: 'middle' };

      worksheet.getCell(signRow + 2, 1).value = `«____»_______________${groupStatement.academicYear.split('-')[1]} г.`;
      worksheet.getCell(signRow + 2, 1).font = { size: 11, name: 'Times New Roman' };
      worksheet.getCell(signRow + 2, 1).alignment = { horizontal: 'left', vertical: 'middle' };

      // === 7. НАСТРОЙКА ШИРИНЫ КОЛОНОК ===
      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 45;
      for (let i = 0; i < subjectCount; i++) worksheet.getColumn(3 + i).width = 8;
      worksheet.getColumn(avgCol).width = 8;
      worksheet.getColumn(behaviorCol).width = 8;
      worksheet.getColumn(totalAbsentCol).width = 8;
      worksheet.getColumn(unjustifiedCol).width = 8;
      worksheet.getColumn(scholarshipCol).width = 8;
      worksheet.getColumn(gradesStartCol).width = 6;
      worksheet.getColumn(gradesStartCol + 1).width = 6;
      worksheet.getColumn(gradesStartCol + 2).width = 6;

      // === 8. НАСТРОЙКА ПЕЧАТИ ===
      worksheet.pageSetup = {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3
        }
      };

      // === 9. СОХРАНЕНИЕ ФАЙЛА ===
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Сводная_ведомость_${groupStatement.groupNumber}_${groupStatement.academicYear}_семестр${groupStatement.semester}.xlsx`);

    } catch (error) {
      console.error('Ошибка при экспорте:', error);
      setError('Не удалось экспортировать ведомость');
    }
  };

  const getAssessmentForm = (subjectName: string): string => {
    if (subjectName.toLowerCase().includes('физическая культура')) return 'З';
    else if (subjectName.toLowerCase().includes('системное программирование') || subjectName.toLowerCase().includes('разработка программных модулей') || subjectName.toLowerCase().includes('поддержка и тестирование программных модулей')) return 'Эу';
    return 'ДЗ';
  };

  const loadGroupStatement = async () => {
    try {
      setLoading(true);
      setError(null);
      const groups = await headApiService.getGroups();
      const group = groups.find(g => g.id === groupId);
      if (!group) throw new Error('Группа не найдена');
      
      const reportData = await headApiService.getGroupReport(groupId);
      
      if (!reportData || !reportData.subjectNames || !reportData.studentsData || !reportData.studentsData[0]) {
        throw new Error('Некорректные данные от сервера');
      }
      const subjects: Subject[] = reportData.subjectNames.map((name, index) => ({
        id: index + 1,
        name: name,
        assessmentForm: getAssessmentForm(name),
      }));
      const studentGrades: StudentGrade[] = reportData.studentsData[0].map((studentData, index) => {
        const gradesMap = new Map<string, string>();
        const naSubjects = new Set<string>();
        subjects.forEach((subject, subjectIndex) => {
          const mark = studentData.marks[subjectIndex];
          let grade = '';
          if (mark === 5) grade = '5';
          else if (mark === 4) grade = '4';
          else if (mark === 3) grade = '3';
          else if (mark === 2) grade = '2';
          else if (mark === 0) {
            grade = 'н/а';
            naSubjects.add(`${subject.name}, ${subject.assessmentForm}`);
          }
          else grade = mark?.toString() || '';
          gradesMap.set(`${subject.name}, ${subject.assessmentForm}`, grade);
        });
        return {
          id: index + 1,
          name: studentData.fio,
          grades: gradesMap,
          average: studentData.average,
          behavior: 'х',
          absencesTotal: studentData.total_absent,
          absencesUnjustified: studentData.non_excused,
          scholarship: studentData.scholarship,
          gradesCount: { five: studentData.count_5, four: studentData.count_4, three: studentData.count_3 },
          naSubjects,
        };
      });
      studentGrades.sort((a, b) => a.name.localeCompare(b.name));
      setGroupStatement({
        id: group.id,
        groupNumber: group.numberGroup.toString(),
        specialty: group.specialty,
        course: group.course,
        semester: selectedSemester,
        academicYear: `${selectedYear}-${selectedYear + 1}`,
        formOfStudy: group.formEducation,
        students: studentGrades,
        subjects,
        studentsCount: studentGrades.length,
      });
    } catch (err) {
      console.error('Ошибка загрузки сводной ведомости:', err);
      setError('Не удалось загрузить данные сводной ведомости');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId: number, subjectKey: string, newGrade: string) => {
    if (!groupStatement) return;
    const updatedGroup = { ...groupStatement };
    const student = updatedGroup.students.find(s => s.id === studentId);
    if (student) {
      student.grades.set(subjectKey, newGrade);
      if (!student.naSubjects) student.naSubjects = new Set();
      if (newGrade === 'н/а') student.naSubjects.add(subjectKey);
      else student.naSubjects.delete(subjectKey);
      let five = 0, four = 0, three = 0, sum = 0, count = 0;
      Array.from(student.grades.values()).forEach(grade => {
        const gradeStr = grade.toString();
        if (gradeStr === '5') five++;
        else if (gradeStr === '4') four++;
        else if (gradeStr === '3') three++;
        const num = parseFloat(gradeStr);
        if (!isNaN(num) && num >= 2 && num <= 5) { sum += num; count++; }
      });
      student.gradesCount = { five, four, three };
      student.average = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
    }
    setGroupStatement(updatedGroup);
  };

  const handleNAGradeClick = (student: StudentGrade, subjectKey: string) => {
    setSelectedNAStudent(student);
    setSelectedNASubject(subjectKey);
    setAttestationFormData({
      attestationForm: 'экзамен',
      teacherName: '',
      headName: 'Голубева Г.А.',
      courseworkTopic: '',
      attestationNumber: '',
      attestationDate: new Date().toISOString().split('T')[0],
      commissionTeacher1: '',
      commissionTeacher2: '',
      commissionTeacher3: '',
      commissionDeadline: '',
      regularDeadline: '' 
    });
    setActiveAttestationTab('regular');
    setIsNAModalOpen(true);
  };

  const formatDateForDocument = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return { day: date.getDate(), month: months[date.getMonth()], year: date.getFullYear() };
  };

  // Генерация обычного направления
  const generateRegularAttestationDocument = async () => {
    if (!selectedNAStudent || !groupStatement || !selectedNASubject) return;
    setIsGenerating(true);
    try {
      const subjectName = selectedNASubject.split(',')[0];
      const specialtyMatch = groupStatement.specialty.match(/(\d+\.\d+\.\d+)\s+(.+)/);
      const currentDate = formatDateForDocument(attestationFormData.attestationDate);
      
      const templateData = {
        attestationForm: attestationFormData.attestationForm,
        semester: groupStatement.semester,
        studentName: selectedNAStudent.name,
        specialityCode: specialtyMatch ? specialtyMatch[1] : '',
        specialityName: specialtyMatch ? specialtyMatch[2] : groupStatement.specialty,
        course: groupStatement.course,
        group: groupStatement.groupNumber,
        subject: subjectName,
        courseworkTopic: attestationFormData.courseworkTopic || '_________________________',
        teacherName: attestationFormData.teacherName || '_________________________',
        headName: attestationFormData.headName,
        attestationNumber: attestationFormData.attestationNumber || '_______',
        attestationDay: currentDate.day,
        attestationMonth: currentDate.month,
        attestationYear: currentDate.year,
        // Добавляем срок сдачи для обычной аттестации
        regularDeadline: attestationFormData.regularDeadline || '_________________________'
      };
      
      // Проверяем существование шаблона
      const response = await fetch('/templates/attestation_direction_template.docx');
      if (!response.ok) {
        throw new Error(`Шаблон не найден: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Проверяем, что файл действительно является zip архивом
      const uint8Array = new Uint8Array(arrayBuffer);
      const isZip = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B;
      
      if (!isZip) {
        throw new Error('Файл шаблона поврежден или имеет неверный формат');
      }
      
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      doc.render(templateData);
      const blob = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, `Направление_на_аттестацию_${selectedNAStudent.name.replace(/\s+/g, '_')}_${subjectName}.docx`);
      
      const updatedGroup = { ...groupStatement };
      const student = updatedGroup.students.find(s => s.id === selectedNAStudent.id);
      if (student) {
        student.grades.set(selectedNASubject, '');
        if (!student.naSubjects) student.naSubjects = new Set();
        student.naSubjects.add(selectedNASubject);
        let five = 0, four = 0, three = 0, sum = 0, count = 0;
        Array.from(student.grades.values()).forEach(grade => {
          const gradeStr = grade.toString();
          if (gradeStr === '5') five++;
          else if (gradeStr === '4') four++;
          else if (gradeStr === '3') three++;
          const num = parseFloat(gradeStr);
          if (!isNaN(num) && num >= 2 && num <= 5) { sum += num; count++; }
        });
        student.gradesCount = { five, four, three };
        student.average = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
      }
      setGroupStatement(updatedGroup);
      setIsNAModalOpen(false);
    } catch (error) {
      console.error('Ошибка создания документа:', error);
      setError(`Не удалось создать документ направления на аттестацию: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Генерация направления на аттестацию комиссией
  const generateCommissionAttestationDocument = async () => {
    if (!selectedNAStudent || !groupStatement || !selectedNASubject) return;
    setIsGenerating(true);
    try {
      const subjectName = selectedNASubject.split(',')[0];
      const specialtyMatch = groupStatement.specialty.match(/(\d+\.\d+\.\d+)\s+(.+)/);
      const currentDate = formatDateForDocument(attestationFormData.attestationDate);
      
      // Формируем строку с комиссией (только заполненные члены)
      const commissionMembers = [
        attestationFormData.commissionTeacher1,
        attestationFormData.commissionTeacher2,
        attestationFormData.commissionTeacher3
      ].filter(name => name && name.trim() !== '');
      
      const commissionList = commissionMembers.length > 0 
        ? commissionMembers.map((name, idx) => `${idx + 1}. ${name}`).join('\n')
        : '1. _________________________';
      
      const templateData = {
        attestationForm: attestationFormData.attestationForm,
        semester: groupStatement.semester,
        studentName: selectedNAStudent.name,
        specialityCode: specialtyMatch ? specialtyMatch[1] : '',
        specialityName: specialtyMatch ? specialtyMatch[2] : groupStatement.specialty,
        course: groupStatement.course,
        group: groupStatement.groupNumber,
        subject: subjectName,
        courseworkTopic: attestationFormData.courseworkTopic || '_________________________',
        headName: attestationFormData.headName,
        attestationNumber: attestationFormData.attestationNumber || '_______',
        attestationDay: currentDate.day,
        attestationMonth: currentDate.month,
        attestationYear: currentDate.year,
        commissionMembers: commissionList,
        commissionDeadline: attestationFormData.commissionDeadline || '_________________________',
        teacherName: attestationFormData.teacherName || '_________________________' // Преподаватель, ведущий дисциплину
      };
      
      // Проверяем существование шаблона для комиссии
      const response = await fetch('/templates/attestation_commission_template.docx');
      if (!response.ok) {
        throw new Error(`Шаблон для комиссии не найден: ${response.status}. Создайте файл attestation_commission_template.docx в папке public/templates/`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Проверяем, что файл действительно является zip архивом
      const uint8Array = new Uint8Array(arrayBuffer);
      const isZip = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B;
      
      if (!isZip) {
        throw new Error('Файл шаблона для комиссии поврежден или имеет неверный формат');
      }
      
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      doc.render(templateData);
      const blob = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, `Направление_на_аттестацию_комиссией_${selectedNAStudent.name.replace(/\s+/g, '_')}_${subjectName}.docx`);
      
      const updatedGroup = { ...groupStatement };
      const student = updatedGroup.students.find(s => s.id === selectedNAStudent.id);
      if (student) {
        student.grades.set(selectedNASubject, '');
        if (!student.naSubjects) student.naSubjects = new Set();
        student.naSubjects.add(selectedNASubject);
        let five = 0, four = 0, three = 0, sum = 0, count = 0;
        Array.from(student.grades.values()).forEach(grade => {
          const gradeStr = grade.toString();
          if (gradeStr === '5') five++;
          else if (gradeStr === '4') four++;
          else if (gradeStr === '3') three++;
          const num = parseFloat(gradeStr);
          if (!isNaN(num) && num >= 2 && num <= 5) { sum += num; count++; }
        });
        student.gradesCount = { five, four, three };
        student.average = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
      }
      setGroupStatement(updatedGroup);
      setIsNAModalOpen(false);
    } catch (error) {
      console.error('Ошибка создания документа для комиссии:', error);
      setError(`Не удалось создать документ направления на аттестацию комиссией: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAttestationDocument = async () => {
    if (activeAttestationTab === 'regular') {
      await generateRegularAttestationDocument();
    } else {
      await generateCommissionAttestationDocument();
    }
  };

  const calculateStatistics = () => {
    if (!groupStatement) return { fivesOnly: 0, foursAndFives: 0, hasThree: 0, naCount: 0 };
    let fivesOnly = 0, foursAndFives = 0, hasThree = 0, naCount = 0;
    groupStatement.students.forEach(student => {
      const grades = Array.from(student.grades.values());
      if (grades.filter(g => g === 'н/а').length > 0) naCount++;
      const numericGrades = grades.filter(g => g === '5' || g === '4' || g === '3');
      if (numericGrades.length === 0) return;
      if (numericGrades.every(g => g === '5')) fivesOnly++;
      if (numericGrades.every(g => g === '5' || g === '4')) foursAndFives++;
      if (numericGrades.filter(g => g === '3').length > 0) hasThree++;
    });
    return { fivesOnly, foursAndFives, hasThree, naCount };
  };

  const getSubjectNameLength = (name: string): string => {
    if (name.length > 50) return 'very-long-name';
    if (name.length > 30) return 'long-name';
    return '';
  };

  const shouldHighlightCell = (student: StudentGrade, subjectKey: string): boolean => {
    return student.naSubjects?.has(subjectKey) || false;
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  const handleSemesterChange = (semester: number) => {
    setSelectedSemester(semester);
  };

  if (loading) {
    return <div className="dh-at-summary-loading" style={{ padding: '40px', textAlign: 'center' }}>
      <div className="dhm-loading-spinner" style={{ margin: '0 auto 16px' }}></div>
      <p>Загрузка сводной ведомости...</p>
    </div>;
  }

  if (error || !groupStatement) {
    return <div className="dh-at-summary-error" style={{ padding: '40px', textAlign: 'center' }}>
      <p className="dhp-error-message">{error || 'Группа не найдена'}</p>
      <button className="dhp-retry-button" onClick={loadGroupStatement}>Попробовать снова</button>
    </div>;
  }

  const statistics = calculateStatistics();

  return (
    <div className="dh-at-statement-wrapper" style={{ height: '100%', overflow: 'auto' }}>
      <div className="dh-at-statement-header">
        <div className="dh-at-statement-actions">
          <div className="dh-at-filters-left">
            <div className="dh-at-filter-group">
              <label className="dh-at-filter-label">Год:</label>
              <select 
                className="dh-at-filter-select" 
                value={selectedYear} 
                onChange={(e) => handleYearChange(Number(e.target.value))}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="dh-at-filter-group">
              <label className="dh-at-filter-label">Семестр:</label>
              <div className="dh-at-semester-buttons">
                <button 
                  className={`dh-at-semester-btn ${selectedSemester === 7 ? 'active' : ''}`} 
                  onClick={() => handleSemesterChange(7)}
                >
                  7 семестр
                </button>
                <button 
                  className={`dh-at-semester-btn ${selectedSemester === 8 ? 'active' : ''}`} 
                  onClick={() => handleSemesterChange(8)}
                >
                  8 семестр
                </button>
              </div>
            </div>
          </div>

          <div className="dh-at-actions-right">
            {isEditing ? (
              <>
                <button className="dh-at-btn-secondary" onClick={() => setIsEditing(false)}>Отменить редактирование</button>
                <button className="dh-at-btn-primary" onClick={() => { setIsEditing(false);}}>Сохранить</button>
              </>
            ) : (
              <>
                <button className="dh-at-btn-secondary" onClick={() => setIsEditing(true)}>Редактировать</button>
                <button className="dh-at-btn-primary" onClick={handleExportStatement}>Экспорт</button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="dh-at-statement-body">
        <div className="dh-at-table-container">
          <table className="dh-at-statement-table">
            <thead>
              <tr><th rowSpan={2}>№ п/п</th><th rowSpan={2}>Фамилия, имя, отчество студента</th>
                <th colSpan={groupStatement.subjects.length}>Наименование дисциплины (МДК)/ форма аттестации</th>
                <th rowSpan={2}>Средний балл</th><th rowSpan={2}>Поведение</th><th rowSpan={2}>Пропуски занятий всего</th>
                <th rowSpan={2}>в т. ч. по неуважит. причинам</th><th rowSpan={2}>Стипендия:</th><th colSpan={3}>Кол-во оценок</th>
              </tr>
              <tr>{groupStatement.subjects.map((subject) => (
                <th key={subject.id} className={`dh-at-vertical-header ${getSubjectNameLength(subject.name)}`}>
                  <div className="dh-at-vertical-text">{subject.name}, {subject.assessmentForm}</div>
                </th>
              ))}<th>5</th><th>4</th><th>3</th></tr>
            </thead>
            <tbody>
              {groupStatement.students.map((student, idx) => (
                <tr key={student.id}>
                  <td>{idx + 1}</td>
                  <td className="dh-at-student-name">{student.name}</td>
                  {groupStatement.subjects.map((subject) => {
                    const subjectKey = `${subject.name}, ${subject.assessmentForm}`;
                    const grade = student.grades.get(subjectKey) || '';
                    const isHighlighted = shouldHighlightCell(student, subjectKey);
                    return (
                      <td key={subject.id} style={isHighlighted ? { backgroundColor: '#cfe6f8' } : {}}>
                        {isEditing ? (
                          <select value={grade} onChange={(e) => handleGradeChange(student.id, subjectKey, e.target.value)} className="dh-at-grade-select">
                            <option value="">-</option><option value="5">5</option><option value="4">4</option>
                            <option value="3">3</option><option value="зач.">зач.</option><option value="н/а">н/а</option>
                          </select>
                        ) : grade === 'н/а' ? (
                          <button className="dh-at-na-button" onClick={() => handleNAGradeClick(student, subjectKey)}>н/а</button>
                        ) : (grade)}
                      </td>
                    );
                  })}
                  <td className="dh-at-average">{formatAverageDisplay(student.average)}</td>
                  <td>{student.behavior}</td>
                  <td>{student.absencesTotal}</td>
                  <td>{student.absencesUnjustified}</td>
                  <td>{student.scholarship}</td>
                  <td>{student.gradesCount.five}</td><td>{student.gradesCount.four}</td><td>{student.gradesCount.three}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={groupStatement.subjects.length + 12} className="dh-at-statistics-footer">
              <div className="dh-at-statistics-grid">
                <div className="dh-at-stat-item"><span>На «5»</span><span className="dh-at-stat-value">{statistics.fivesOnly} чел.</span></div>
                <div className="dh-at-stat-item"><span>На «4», «5»</span><span className="dh-at-stat-value">{statistics.foursAndFives} чел.</span></div>
                <div className="dh-at-stat-item"><span>Есть «3»</span><span className="dh-at-stat-value">{statistics.hasThree} чел.</span></div>
                <div className="dh-at-stat-item"><span>н/а</span><span className="dh-at-stat-value dh-at-na-stat">{statistics.naCount} чел.</span></div>
              </div>
            </td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Модальное окно с вкладками */}
      {isNAModalOpen && selectedNAStudent && (
        <div className="dh-at-modal-overlay" onClick={() => setIsNAModalOpen(false)}>
          <div className="dh-at-modal-content dh-at-attestation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dh-at-modal-header">
              <h3>Направление на аттестацию</h3>
              <button className="dh-at-modal-close" onClick={() => setIsNAModalOpen(false)}>×</button>
            </div>
            
            {/* Вкладки */}
            <div className="dh-at-attestation-tabs">
              <button 
                className={`dh-at-tab-btn ${activeAttestationTab === 'regular' ? 'active' : ''}`}
                onClick={() => setActiveAttestationTab('regular')}
              >
                Обычная аттестация
              </button>
              <button 
                className={`dh-at-tab-btn ${activeAttestationTab === 'commission' ? 'active' : ''}`}
                onClick={() => setActiveAttestationTab('commission')}
              >
                Аттестация комиссией
              </button>
            </div>

            <div className="dh-at-modal-body">
              <div className="dh-at-na-info">
                <p>Студент: <strong>{selectedNAStudent.name}</strong></p>
                <p>Предмет: <strong>{selectedNASubject.split(',')[0]}</strong></p>
              </div>

              {/* Общие поля для обеих вкладок */}
              <div className="dh-at-form-group">
                <label>Форма аттестации *</label>
                <select 
                  value={attestationFormData.attestationForm} 
                  onChange={(e) => setAttestationFormData({...attestationFormData, attestationForm: e.target.value})} 
                  className="dh-at-input"
                >
                  {attestationForms.map(form => <option key={form} value={form}>{form}</option>)}
                </select>
              </div>

              <div className="dh-at-form-group">
                <label>Заведующий отделением *</label>
                <select 
                  value={attestationFormData.headName} 
                  onChange={(e) => setAttestationFormData({...attestationFormData, headName: e.target.value})} 
                  className="dh-at-input"
                >
                  {headOptions.map(head => <option key={head} value={head}>{head}</option>)}
                </select>
              </div>

              {/* Поля для обычной аттестации */}
              {activeAttestationTab === 'regular' && (
                <>
                  <div className="dh-at-form-group">
                    <label>Преподаватель (ФИО) *</label>
                    <input 
                      type="text" 
                      value={attestationFormData.teacherName} 
                      onChange={(e) => setAttestationFormData({...attestationFormData, teacherName: e.target.value})} 
                      className="dh-at-input" 
                      placeholder="Введите ФИО преподавателя" 
                      required 
                    />
                  </div>

                  {/* НОВОЕ ПОЛЕ - Срок сдачи */}
                  <div className="dh-at-form-group">
                    <label>Срок сдачи (до)</label>
                    <input 
                      type="text" 
                      value={attestationFormData.regularDeadline} 
                      onChange={(e) => setAttestationFormData({...attestationFormData, regularDeadline: e.target.value})} 
                      className="dh-at-input" 
                      placeholder="Например: 25.12.2024" 
                    />
                  </div>

                  {attestationFormData.attestationForm === 'курсовой проект' && (
                    <div className="dh-at-form-group">
                      <label>Тема курсового проекта</label>
                      <textarea 
                        value={attestationFormData.courseworkTopic} 
                        onChange={(e) => setAttestationFormData({...attestationFormData, courseworkTopic: e.target.value})} 
                        className="dh-at-textarea" 
                        placeholder="Введите тему курсового проекта" 
                        rows={2}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Поля для аттестации комиссией */}
              {activeAttestationTab === 'commission' && (
                <>
                  <div className="dh-at-form-group">
                    <label>Преподаватель, который ведет дисциплину *</label>
                    <input 
                      type="text" 
                      value={attestationFormData.teacherName} 
                      onChange={(e) => setAttestationFormData({...attestationFormData, teacherName: e.target.value})} 
                      className="dh-at-input" 
                      placeholder="Введите ФИО преподавателя" 
                      required 
                    />
                  </div>
                  <div className="dh-at-form-group">
                    <label>Председатель комиссии *</label>
                    <input 
                      type="text" 
                      value={attestationFormData.commissionTeacher2} 
                      onChange={(e) => setAttestationFormData({...attestationFormData, commissionTeacher2: e.target.value})} 
                      className="dh-at-input" 
                      placeholder="Введите ФИО члена комиссии" 
                    />
                  </div>

                  <div className="dh-at-form-group">
                    <label>Срок аттестации (до)</label>
                    <input 
                      type="text" 
                      value={attestationFormData.commissionDeadline} 
                      onChange={(e) => setAttestationFormData({...attestationFormData, commissionDeadline: e.target.value})} 
                      className="dh-at-input" 
                      placeholder="Например: 25.12.2024" 
                    />
                  </div>
                </>
              )}
            </div>

            <div className="dh-at-modal-footer">
              <button className="dh-at-btn-secondary" onClick={() => setIsNAModalOpen(false)}>Отмена</button>
              <button 
                className="dh-at-btn-primary" 
                onClick={generateAttestationDocument} 
                disabled={isGenerating || (activeAttestationTab === 'regular' && !attestationFormData.teacherName) || (activeAttestationTab === 'commission' && !attestationFormData.teacherName)}
              >
                {isGenerating ? 'Формирование...' : 'Создать направление'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};