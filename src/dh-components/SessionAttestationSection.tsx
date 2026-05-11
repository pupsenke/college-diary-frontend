import React, { useState, useEffect } from 'react';
import { headApiService, StudentInfo, SubjectTeacher } from '../services/headApiService';
import { SessionAttestationService, AttestationData } from '../services/sessionAttestationService';
import './SessionAttestationSectionStyle.css';

interface SessionAttestationSectionProps {
  groupId: number;
  onClose?: () => void;
}

type AttestationForm = 'exam' | 'credit' | 'test';

export const SessionAttestationSection: React.FC<SessionAttestationSectionProps> = ({ groupId, onClose }) => {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectTeacher[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [availableTeachers, setAvailableTeachers] = useState<SubjectTeacher[]>([]);
  const [attestationForm, setAttestationForm] = useState<AttestationForm>('exam');
  const [semester, setSemester] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [date, setDate] = useState<string>(new Date().toLocaleDateString('ru-RU'));

  useEffect(() => {
    loadData();
  }, [groupId]);

  useEffect(() => {
    if (selectedSubjectId) {
      const teachers = subjects.filter(s => s.subjectId === selectedSubjectId);
      setAvailableTeachers(teachers);
      if (teachers.length > 0) {
        setSelectedTeacherId(teachers[0].teacherId);
      } else {
        setSelectedTeacherId(null);
      }
    }
  }, [selectedSubjectId, subjects]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, groupData, subjectsData] = await Promise.all([
        headApiService.getGroupStudents(groupId),
        headApiService.getGroupById(groupId),
        headApiService.getGroupSubjectsWithTeachers(groupId)
      ]);
      
      setStudents(studentsData);
      setGroupInfo(groupData);
      
      // Получаем уникальные предметы
      const uniqueSubjectsMap = new Map<number, SubjectTeacher>();
      subjectsData.forEach(s => {
        if (!uniqueSubjectsMap.has(s.subjectId)) {
          uniqueSubjectsMap.set(s.subjectId, s);
        }
      });
      const uniqueSubjects = Array.from(uniqueSubjectsMap.values());
      setSubjects(uniqueSubjects);
      
      if (uniqueSubjects.length > 0) {
        setSelectedSubjectId(uniqueSubjects[0].subjectId);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTeacher = () => {
    return availableTeachers.find(t => t.teacherId === selectedTeacherId);
  };

  const handleExport = async () => {
    if (students.length === 0) {
      alert('Нет студентов для формирования ведомости');
      return;
    }
    
    setExporting(true);
    try {
      const selectedTeacher = getSelectedTeacher();
      const selectedSubject = subjects.find(s => s.subjectId === selectedSubjectId);
      
      const attestationNumber = '';
      
      const attestationData: AttestationData = {
        attestationNumber: attestationNumber,
        date: date,
        attestationForm: attestationForm,
        semester: semester,
        teacherName: selectedTeacher ? `${selectedTeacher.teacherLastName} ${selectedTeacher.teacherName.charAt(0)}.${selectedTeacher.teacherPatronymic ? selectedTeacher.teacherPatronymic.charAt(0) + '.' : ''}` : 'Не указан',
        subject: selectedSubject?.subjectName || 'Не указан',
        specialityCode: groupInfo?.specialty?.split(' ')[0] || '09.02.07',
        specialityName: groupInfo?.specialty || 'Информационные системы и программирование',
        course: groupInfo?.course || 1,
        group: `${groupInfo?.numberGroup || groupId}`,
        students: students.map((student, index) => ({
          number: index + 1,
          fullName: `${student.lastName} ${student.name.charAt(0)}.${student.patronymic ? student.patronymic.charAt(0) + '.' : ''}`,
          fullNameOriginal: `${student.lastName} ${student.name} ${student.patronymic}`
        })),
        headName: "Голубева Г.А."
      };
      
      console.log('Данные для экспорта:', attestationData);
      
      const documentBlob = await SessionAttestationService.generateAttestationDocument(attestationData);
      const fileName = `Аттестационная_ведомость_${groupInfo?.numberGroup || groupId}_${selectedSubject?.subjectName || 'предмет'}.doc`;
      SessionAttestationService.downloadDocument(documentBlob, fileName);
      
    } catch (error) {
      console.error('Ошибка при экспорте:', error);
      alert('Произошла ошибка при формировании документа. Пожалуйста, попробуйте снова.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="sas-loading-container">
        <div className="sas-loading-spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="sas-container">
      <div className="sas-header">
        <h2>Аттестационная ведомость</h2>
        <p className="sas-subtitle">Формирование документов для промежуточной аттестации</p>
      </div>

      <div className="sas-form">
        <div className="sas-form-row">
          <div className="sas-form-group">
            <label className="sas-label">Дата</label>
            <input 
              type="date" 
              className="sas-input"
              value={date.split('.').reverse().join('-')}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                setDate(newDate.toLocaleDateString('ru-RU'));
              }}
            />
          </div>

          <div className="sas-form-group">
            <label className="sas-label">Семестр</label>
            <div className="sas-semester-buttons">
              <button 
                className={`sas-semester-btn ${semester === 1 ? 'active' : ''}`}
                onClick={() => setSemester(1)}
              >
                1 семестр
              </button>
              <button 
                className={`sas-semester-btn ${semester === 2 ? 'active' : ''}`}
                onClick={() => setSemester(2)}
              >
                2 семестр
              </button>
            </div>
          </div>
        </div>

        <div className="sas-form-row">
          <div className="sas-form-group">
            <label className="sas-label">Дисциплина</label>
            <select 
              className="sas-select"
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
            >
              {subjects.map(subject => (
                <option key={subject.subjectId} value={subject.subjectId}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </div>

          <div className="sas-form-group">
            <label className="sas-label">Преподаватель</label>
            <select 
              className="sas-select"
              value={selectedTeacherId || ''}
              onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
              disabled={availableTeachers.length === 0}
            >
              {availableTeachers.map(teacher => (
                <option key={teacher.teacherId} value={teacher.teacherId}>
                  {teacher.teacherLastName} {teacher.teacherName.charAt(0)}.{teacher.teacherPatronymic ? teacher.teacherPatronymic.charAt(0) + '.' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sas-form-row">
          <div className="sas-form-group">
            <label className="sas-label">Вид аттестации</label>
            <div className="sas-attestation-buttons">
              <button 
                className={`sas-attestation-btn ${attestationForm === 'exam' ? 'active' : ''}`}
                onClick={() => setAttestationForm('exam')}
              >
                Экзамен
              </button>
              <button 
                className={`sas-attestation-btn ${attestationForm === 'credit' ? 'active' : ''}`}
                onClick={() => setAttestationForm('credit')}
              >
                Зачет
              </button>
              <button 
                className={`sas-attestation-btn ${attestationForm === 'test' ? 'active' : ''}`}
                onClick={() => setAttestationForm('test')}
              >
                Контрольная работа
              </button>
            </div>
          </div>
        </div>

        <div className="sas-students-info">
          <h4>Студенты группы ({students.length})</h4>
          <div className="sas-students-list">
            {students.map((student, index) => (
              <div key={student.id} className="sas-student-item">
                {index + 1}. {student.lastName} {student.name} {student.patronymic}
              </div>
            ))}
          </div>
        </div>

        <div className="sas-actions">
          <button 
            className="sas-export-btn"
            onClick={handleExport}
            disabled={exporting || students.length === 0}
          >
            {exporting ? 'Формирование документа...' : 'Сформировать ведомость'}
          </button>
        </div>
      </div>
    </div>
  );
};