import React, { useState, useMemo, useEffect, useCallback } from 'react';
import './SocialReportsSection.css';
import { socialApiService, OrphanStudentApi, DisabledStudentApi, CertificateFile } from '../services/socialApiService';
import { API_BASE_URL } from '../constants/apiConstant';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

interface ReportData {
  id: number;
  name: string;
  type: 'orphans' | 'disabled';
  date: string;
  fileId: number;
  fileName: string;
}

interface DisabledStudent {
  id: number;
  fio: string;
  numberGroup: number;
  specialty: string;
  certificate: {
    fullInfo: string;
    images: Array<{ fileId: number; url: string; fileName: string }>;
  };
  status: string | null;
  limitationType: string | null;
  birthDate: string | null;
  address: string | null;
  telephone: string | null;
  educationForm: string | null;
  idGroup: number;
  idStudent: number;
}

interface OrphanStudent {
  id: number;
  fio: string;
  numberGroup: number;
  specialty: string;
  birthDate: string | null;
  parentInfo: string | null;
  telephone: string | null;
  registrationAddress: string | null;
  guardian: string | null;
  educationForm: string | null;
  idGroup: number;
  idStudent: number;
}

// Кэш для специальностей групп
const groupSpecialtyCache = new Map<number, string>();

const REPORT_TYPES = [
  {
    key: 'orphans' as const,
    title: 'Дети-сироты',
    subtitle: 'и детях, оставшихся без попечения родителей',
    cardImg: '/social-icons/orphans_icon.svg',
    modalImg: '/social-icons/orphans_icon.svg',
    templateFile: '/templates/orphans.docx',
    reportType: 'сироты' as const
  },
  {
    key: 'disabled' as const,
    title: 'Дети-инвалиды',
    subtitle: 'и лицах с ограниченными возможностями здоровья',
    cardImg: '/social-icons/disabled_icon.svg',
    modalImg: '/social-icons/disabled_icon.svg',
    templateFile: '/templates/invalid.docx',
    reportType: 'инвалиды' as const
  }
];

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
  handleCertificateDelete: (studentId: number, fileId: number) => void;
  handleDownloadAllCertificates: (studentId: number) => void;
  loading: boolean;
}

const validatePhone = (phone: string): boolean => {
  if (!phone || phone === '' || phone === '—') return true;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length === 11;
};

const validateFIO = (fio: string): boolean => {
  if (fio === '' || fio === '—') return true;
  const words = fio.trim().split(/\s+/);
  return words.length >= 2;
};

const validateField = (field: string, value: string): { isValid: boolean; error?: string } => {
  if (field === 'telephone' || field === 'phone') {
    if (value && value !== '—' && !validatePhone(value)) {
      return { isValid: false, error: 'Введите корректный номер телефона' };
    }
  }
  if (field === 'fio') {
    if (value && value !== '—' && !validateFIO(value)) {
      return { isValid: false, error: 'ФИО должно содержать минимум фамилию и имя' };
    }
  }
  return { isValid: true };
};

const DisabledStudentsModal: React.FC<DisabledStudentsModalProps> = ({
  onClose,
  studentSearchTerm,
  setStudentSearchTerm,
  filteredDisabledStudents,
  renderCell,
  updateCertificateInfo,
  handleCertificateUpload,
  handleCertificateDelete,
  handleDownloadAllCertificates,
  loading
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
          {loading ? (
            <div className="loading-overlay">Загрузка данных...</div>
          ) : (
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
                    <td>{renderCell(student.fio || '—', 'disabled', student.id, 'fio')}</td>
                    <td>{renderCell(student.numberGroup?.toString() || '—', 'disabled', student.id, 'numberGroup')}</td>
                    <td>{renderCell(student.specialty || '—', 'disabled', student.id, 'specialty')}</td>
                    <td className="certificate-cell">
                      <div className="certificate-info">
                        <div className="certificate-fields">
                          {renderCell(student.certificate.fullInfo, 'disabled', student.id, 'certificate', 'Серия, номер, дата, срок действия')}
                        </div>
                        
                        <div className="certificate-actions-bar">
                          {student.certificate.images.length > 0 && (
                            <button
                              className="cert-action-btn download-all"
                              onClick={() => handleDownloadAllCertificates(student.idStudent)}
                              title="Скачать все справки"
                            >
                              Скачать все
                            </button>
                          )}
                          
                          <button
                            className="cert-action-btn add"
                            onClick={() => document.getElementById(`cert-input-${student.id}`)?.click()}
                            title="Прикрепить справку"
                          >
                            +
                          </button>
                          
                          <input
                            id={`cert-input-${student.id}`}
                            type="file"
                            accept="image/*,application/pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleCertificateUpload(student.idStudent, e.target.files[0]);
                              }
                            }}
                          />
                        </div>
                        
                        {student.certificate.images.length > 0 && (
                          <div className="cert-files-list">
                            {student.certificate.images.map((img) => (
                              <div key={img.fileId} className="cert-file-tag">
                                <span className="cert-file-name" title={img.fileName}>{img.fileName}</span>
                                <button
                                  className="cert-file-remove"
                                  onClick={() => handleCertificateDelete(student.id, img.fileId)}
                                  title="Удалить справку"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{renderCell(student.status || '—', 'disabled', student.id, 'status')}</td>
                    <td>{renderCell(student.limitationType || '—', 'disabled', student.id, 'limitationType')}</td>
                    <td>{renderCell(student.birthDate || '—', 'disabled', student.id, 'birthDate')}</td>
                    <td>{renderCell(student.address || '—', 'disabled', student.id, 'address')}</td>
                    <td>{renderCell(student.educationForm || '—', 'disabled', student.id, 'educationForm')}</td>
                  </tr>
                ))}
                {filteredDisabledStudents.length === 0 && (
                  <tr>
                    <td colSpan={10} className="empty-row">Студенты не найдены</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

interface OrphanStudentsModalProps extends StudentsModalProps {
  filteredOrphanStudents: OrphanStudent[];
  loading: boolean;
}

const OrphanStudentsModal: React.FC<OrphanStudentsModalProps> = ({
  onClose,
  studentSearchTerm,
  setStudentSearchTerm,
  filteredOrphanStudents,
  renderCell,
  loading
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
          {loading ? (
            <div className="loading-overlay">Загрузка данных...</div>
          ) : (
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
                    <td>{renderCell(student.fio || '—', 'orphan', student.id, 'fio')}</td>
                    <td>{renderCell(student.numberGroup?.toString() || '—', 'orphan', student.id, 'numberGroup')}</td>
                    <td>{renderCell(student.specialty || '—', 'orphan', student.id, 'specialty')}</td>
                    <td>{renderCell(student.birthDate || '—', 'orphan', student.id, 'birthDate')}</td>
                    <td>{renderCell(student.parentInfo || '—', 'orphan', student.id, 'parentInfo')}</td>
                    <td>{renderCell(student.telephone || '—', 'orphan', student.id, 'telephone')}</td>
                    <td>{renderCell(student.registrationAddress || '—', 'orphan', student.id, 'registrationAddress')}</td>
                    <td>{renderCell(student.guardian || '—', 'orphan', student.id, 'guardian')}</td>
                    <td>{renderCell(student.educationForm || '—', 'orphan', student.id, 'educationForm')}</td>
                  </tr>
                ))}
                {filteredOrphanStudents.length === 0 && (
                  <tr>
                    <td colSpan={10} className="empty-row">Студенты не найдены</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export const ReportsSection: React.FC = () => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [currentReportType, setCurrentReportType] = useState<'orphans' | 'disabled' | null>(null);

  const [disabledStudents, setDisabledStudents] = useState<DisabledStudent[]>([]);
  const [orphanStudents, setOrphanStudents] = useState<OrphanStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingInfo, setEditingInfo] = useState<{
    type: 'disabled' | 'orphan';
    id: number;
    field: string;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'orphans' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [newReportName, setNewReportName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<{ field: string; error: string } | null>(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const loadSavedReports = useCallback(async () => {
    try {
      const [orphansReports, disabledReports] = await Promise.all([
        socialApiService.getReportsByType('сироты'),
        socialApiService.getReportsByType('инвалиды')
      ]);

      const formattedReports: ReportData[] = [
        ...orphansReports.map(report => ({
          id: report.id,
          name: report.nameFile.replace(/\.docx$/, '').replace(/_/g, ' '),
          type: 'orphans' as const,
          date: new Date().toLocaleDateString('ru-RU'),
          fileId: report.id,
          fileName: report.nameFile
        })),
        ...disabledReports.map(report => ({
          id: report.id,
          name: report.nameFile.replace(/\.docx$/, '').replace(/_/g, ' '),
          type: 'disabled' as const,
          date: new Date().toLocaleDateString('ru-RU'),
          fileId: report.id,
          fileName: report.nameFile
        }))
      ];

      setReports(formattedReports);
    } catch (error) {
      console.error('Error loading saved reports:', error);
    }
  }, []);

  const getGroupSpecialty = useCallback(async (groupNumber: number): Promise<string> => {
    if (groupSpecialtyCache.has(groupNumber)) {
      return groupSpecialtyCache.get(groupNumber)!;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/groups/stats/curator/88`);
      if (response.ok) {
        const groupsData = await response.json();
        const group = groupsData.find((g: any) => g.groupNumber === groupNumber);
        if (group && group.specialty) {
          groupSpecialtyCache.set(groupNumber, group.specialty);
          return group.specialty;
        }
      }
    } catch (error) {
      console.error('Error fetching group specialty:', error);
    }
    return '';
  }, []);

  const getStudentDetails = useCallback(async (studentId: number): Promise<{
    telephone?: string;
    address?: string;
    educationBasis?: string;
    birthDate?: string;
    lastName?: string;
    firstName?: string;
    patronymic?: string;
  } | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/students/id/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        return {
          telephone: data.telephone,
          address: data.address,
          educationBasis: data.educationBasis,
          birthDate: data.birthDate,
          lastName: data.lastName,
          firstName: data.name,
          patronymic: data.patronymic
        };
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
    return null;
  }, []);

  const loadOrphans = useCallback(async () => {
    try {
      const data = await socialApiService.getOrphans();
      
      const enrichedOrphans = await Promise.all(data.map(async (item) => {
        let fio = item.fio;
        let specialty = item.specialty;
        let telephone = item.telephone;
        let registrationAddress = item.registrationAddress;
        let birthDate = item.birthDate;
        let educationForm = item.educationForm;

        if (!fio || fio === 'null' || fio === '—') {
          const studentDetails = await getStudentDetails(item.idStudent);
          if (studentDetails) {
            const lastName = studentDetails.lastName || '';
            const firstName = studentDetails.firstName || '';
            const patronymic = studentDetails.patronymic || '';
            fio = `${lastName} ${firstName} ${patronymic}`.trim();
            
            if (!telephone && studentDetails.telephone) telephone = studentDetails.telephone;
            if (!registrationAddress && studentDetails.address) registrationAddress = studentDetails.address;
            if ((!birthDate || birthDate === 'null') && studentDetails.birthDate) {
              birthDate = socialApiService.formatDateRu(studentDetails.birthDate);
            }
            if ((!educationForm || educationForm === 'null') && studentDetails.educationBasis) {
              educationForm = studentDetails.educationBasis;
            }
          }
        }

        if (!specialty || specialty === 'null') {
          const groupSpecialty = await getGroupSpecialty(item.numberGroup);
          if (groupSpecialty) specialty = groupSpecialty;
        }

        return {
          id: item.id,
          fio: fio || '—',
          numberGroup: item.numberGroup,
          specialty: specialty || '—',
          birthDate: birthDate || '—',
          parentInfo: item.parentInfo || '—',
          telephone: telephone || '—',
          registrationAddress: registrationAddress || '—',
          guardian: item.guardian || '—',
          educationForm: educationForm || '—',
          idGroup: item.idGroup,
          idStudent: item.idStudent
        };
      }));

      setOrphanStudents(enrichedOrphans);
    } catch (error) {
      console.error('Error loading orphans:', error);
    }
  }, [getStudentDetails, getGroupSpecialty]);

  const loadInvalids = useCallback(async () => {
    try {
      const invalidsData = await socialApiService.getInvalids();
      let certificates: CertificateFile[] = [];
      
      try {
        certificates = await socialApiService.getCertificates();
      } catch (certErr) {
        console.warn('Не удалось загрузить сертификаты:', certErr);
      }

      const certMap = new Map<number, CertificateFile[]>();
      certificates.forEach(cert => {
        if (cert.idStudent) {
          if (!certMap.has(cert.idStudent)) {
            certMap.set(cert.idStudent, []);
          }
          certMap.get(cert.idStudent)!.push(cert);
        }
      });

      const enrichedInvalids = await Promise.all(invalidsData.map(async (item) => {
        let fio = item.fio;
        let specialty = item.specialty;
        let telephone = item.telephone;
        let address = item.address;
        let birthDate = item.birthDate;
        let educationForm = item.educationForm;

        if (!fio || fio === 'null' || fio === '—') {
          const studentDetails = await getStudentDetails(item.idStudent);
          if (studentDetails) {
            const lastName = studentDetails.lastName || '';
            const firstName = studentDetails.firstName || '';
            const patronymic = studentDetails.patronymic || '';
            fio = `${lastName} ${firstName} ${patronymic}`.trim();
            
            if ((!telephone || telephone === 'null') && studentDetails.telephone) telephone = studentDetails.telephone;
            if ((!address || address === 'null') && studentDetails.address) address = studentDetails.address;
            if ((!birthDate || birthDate === 'null') && studentDetails.birthDate) {
              birthDate = socialApiService.formatDateRu(studentDetails.birthDate);
            }
            if ((!educationForm || educationForm === 'null') && studentDetails.educationBasis) {
              educationForm = studentDetails.educationBasis;
            }
          }
        }

        if (!specialty || specialty === 'null') {
          const groupSpecialty = await getGroupSpecialty(item.numberGroup);
          if (groupSpecialty) specialty = groupSpecialty;
        }

        const studentCerts = (item.idStudent ? certMap.get(item.idStudent) : null) || [];
        const images = studentCerts.map(cert => ({
          fileId: cert.id,
          url: socialApiService.getFileUrl(cert.id),
          fileName: cert.nameFile || `справка_${cert.id}`
        }));

        return {
          id: item.id,
          fio: fio || '—',
          numberGroup: item.numberGroup,
          specialty: specialty || '—',
          certificate: {
            fullInfo: item.certificate || '',
            images: images
          },
          status: item.status || '—',
          limitationType: item.limitationType || '—',
          birthDate: birthDate || '—',
          address: address || '—',
          telephone: telephone || '—',
          educationForm: educationForm || '—',
          idGroup: item.idGroup,
          idStudent: item.idStudent
        };
      }));

      setDisabledStudents(enrichedInvalids);
    } catch (error) {
      console.error('Error loading invalids:', error);
      setDisabledStudents([]);
    }
  }, [getStudentDetails, getGroupSpecialty]);

  const loadAllData = useCallback(async () => {
    setLoadingStudents(true);
    try {
      await Promise.all([loadOrphans(), loadInvalids(), loadSavedReports()]);
    } catch (error) {
      console.error('Error loading all data:', error);
    } finally {
      setLoadingStudents(false);
    }
  }, [loadOrphans, loadInvalids, loadSavedReports]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

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
    return disabledStudents.filter(s => s.fio.toLowerCase().includes(term));
  }, [disabledStudents, studentSearchTerm]);

  const filteredOrphanStudents = useMemo(() => {
    if (!studentSearchTerm) return orphanStudents;
    const term = studentSearchTerm.toLowerCase();
    return orphanStudents.filter(s => s.fio.toLowerCase().includes(term));
  }, [orphanStudents, studentSearchTerm]);

  useEffect(() => {
    if (showCreateModal || showStudentsModal || confirmModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCreateModal, showStudentsModal, confirmModalOpen]);

  const handleRefresh = async () => {
    setRefreshing(true);
    socialApiService.invalidateAllReportsCache();
    groupSpecialtyCache.clear();
    await loadAllData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const openCreateModal = (type: 'orphans' | 'disabled') => {
    setNewReportName(
      `Информация ${type === 'orphans' ? 'о детях-сиротах' : 'о лицах с инвалидностью'}`
    );
    setShowCreateModal(true);
    setCurrentReportType(type);
  };

  const openStudentsModal = async (type: 'orphans' | 'disabled') => {
    setCurrentReportType(type);
    setStudentSearchTerm('');
    setShowStudentsModal(true);
    
    if (type === 'disabled') {
      setLoadingStudents(true);
      try {
        socialApiService.invalidateCertificatesCache();
        await loadInvalids();
      } catch (error) {
        console.error('Error refreshing invalids with certificates:', error);
      } finally {
        setLoadingStudents(false);
      }
    }
  };

  const generateWordReport = async (type: 'orphans' | 'disabled', customName?: string) => {
    setIsGenerating(true);
    try {
      const reportType = REPORT_TYPES.find(t => t.key === type);
      if (!reportType) return;

      const templateResponse = await fetch(reportType.templateFile);
      if (!templateResponse.ok) {
        throw new Error(`Шаблон не найден: ${reportType.templateFile}`);
      }
      const templateBlob = await templateResponse.blob();
      const templateArrayBuffer = await templateBlob.arrayBuffer();

      const zip = new PizZip(templateArrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      const currentDate = new Date();
      const currentDateStr = currentDate.toLocaleDateString('ru-RU');
      const currentDateLong = currentDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      if (type === 'orphans') {
        const students = orphanStudents.map((s, index) => ({
          num: index + 1,
          fio: s.fio || '',
          numberGroup: s.numberGroup || '',
          specialty: s.specialty || '',
          birthDate: s.birthDate || '',
          parentInfo: s.parentInfo || '',
          telephone: s.telephone || '',
          registrationAddress: s.registrationAddress || '',
          guardian: s.guardian || '',
          educationForm: s.educationForm || ''
        }));

        doc.setData({
          reportDate: currentDateLong,
          students: students
        });
      } else {
        const students = disabledStudents.map((s, index) => ({
          num: index + 1,
          fio: s.fio || '',
          numberGroup: s.numberGroup || '',
          specialty: s.specialty || '',
          certificate: s.certificate.fullInfo || '',
          status: s.status || '',
          limitationType: s.limitationType || '',
          birthDate: s.birthDate || '',
          address: s.address || '',
          telephone: s.telephone || '',
          educationForm: s.educationForm || ''
        }));

        doc.setData({
          reportDate: currentDateStr,
          students: students
        });
      }

      doc.render();
      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const fileName = `${customName || `Информация_${reportType.title}`}_${currentDateStr.replace(/\./g, '_')}.docx`;
      
      const uploadResult = await socialApiService.uploadReport(
        new File([out], fileName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        0,
        reportType.reportType
      );

      if (uploadResult.success) {
        const newReport: ReportData = {
          id: uploadResult.fileId || Date.now(),
          name: customName || `Информация ${reportType.title}`,
          type: type,
          date: currentDateStr,
          fileId: uploadResult.fileId || Date.now(),
          fileName: fileName
        };
        setReports(prev => [newReport, ...prev]);
      }

      saveAs(out, fileName);

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Ошибка при формировании отчёта');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (reportId: number) => {
    const report = reports.find(r => r.id === reportId);
    if (!report || !report.fileId) return;
    
    try {
      const blob = await socialApiService.downloadReport(report.fileId);
      saveAs(blob, report.fileName);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Ошибка при скачивании отчета');
    }
  };

  const handleDeleteReport = useCallback((reportId: number) => {
    const report = reports.find(r => r.id === reportId);
    if (!report || !report.fileId) return;
    
    setConfirmModalConfig({
      title: 'Удаление отчета',
      message: `Вы уверены, что хотите удалить отчет "${report.name}"? Это действие нельзя отменить.`,
      onConfirm: async () => {
        try {
          await socialApiService.deleteReport(report.fileId!);
          setReports(prev => prev.filter(r => r.id !== reportId));
        } catch (error) {
          console.error('Error deleting report:', error);
          alert('Ошибка при удалении отчета');
        }
        setConfirmModalOpen(false);
      }
    });
    setConfirmModalOpen(true);
  }, [reports]);

  const handleCreateSubmit = async () => {
    if (!currentReportType) return;
    setShowCreateModal(false);
    await generateWordReport(currentReportType, newReportName);
    setCurrentReportType(null);
    setNewReportName('');
  };

  const startEditing = useCallback((type: 'disabled' | 'orphan', id: number, field: string, currentValue: string) => {
    const cleanValue = currentValue === '—' ? '' : currentValue;
    setEditingInfo({ type, id, field });
    setEditingValue(cleanValue);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingInfo) return;

    const validation = validateField(editingInfo.field, editingValue);
    if (!validation.isValid) {
      setValidationError({ field: editingInfo.field, error: validation.error || 'Ошибка валидации' });
      setTimeout(() => setValidationError(null), 3000);
      setEditingInfo(null);
      setEditingValue('');
      return;
    }

    try {
      if (editingInfo.type === 'disabled') {
        const student = disabledStudents.find(s => s.id === editingInfo.id);
        if (!student) return;

        let updateData: Partial<DisabledStudentApi> = {};

        if (editingInfo.field === 'certificate') {
          updateData = { certificate: editingValue };
        } else if (editingInfo.field === 'status') {
          updateData = { status: editingValue };
        } else if (editingInfo.field === 'limitationType') {
          updateData = { limitationType: editingValue };
        } else if (editingInfo.field === 'address') {
          updateData = { address: editingValue };
        } else if (editingInfo.field === 'educationForm') {
          updateData = { educationForm: editingValue };
        } else if (editingInfo.field === 'fio') {
          updateData = { fio: editingValue };
        } else if (editingInfo.field === 'numberGroup') {
          updateData = { numberGroup: parseInt(editingValue) || student.numberGroup };
        } else if (editingInfo.field === 'specialty') {
          updateData = { specialty: editingValue };
        } else if (editingInfo.field === 'birthDate') {
          const isoDate = socialApiService.parseDateRuToIso(editingValue);
          updateData = { birthDate: isoDate };
        } else if (editingInfo.field === 'telephone') {
          updateData = { telephone: editingValue };
        }

        await socialApiService.updateInvalid(editingInfo.id, updateData);

        const displayValue = editingInfo.field === 'birthDate'
          ? socialApiService.formatDateRu(socialApiService.parseDateRuToIso(editingValue))
          : editingValue;

        setDisabledStudents(prev => prev.map(s =>
          s.id === editingInfo.id
            ? (editingInfo.field === 'certificate'
                ? { ...s, certificate: { ...s.certificate, fullInfo: editingValue } }
                : { ...s, [editingInfo.field]: displayValue })
            : s
        ));
      } else {
        const student = orphanStudents.find(s => s.id === editingInfo.id);
        if (!student) return;

        let updateData: Partial<OrphanStudentApi> = {};

        if (editingInfo.field === 'guardian') {
          updateData = { guardian: editingValue };
        } else if (editingInfo.field === 'telephone') {
          updateData = { telephone: editingValue };
        } else if (editingInfo.field === 'registrationAddress') {
          updateData = { registrationAddress: editingValue };
        } else if (editingInfo.field === 'parentInfo') {
          updateData = { parentInfo: editingValue };
        } else if (editingInfo.field === 'educationForm') {
          updateData = { educationForm: editingValue };
        } else if (editingInfo.field === 'fio') {
          updateData = { fio: editingValue };
        } else if (editingInfo.field === 'numberGroup') {
          updateData = { numberGroup: parseInt(editingValue) || student.numberGroup };
        } else if (editingInfo.field === 'specialty') {
          updateData = { specialty: editingValue };
        } else if (editingInfo.field === 'birthDate') {
          const isoDate = socialApiService.parseDateRuToIso(editingValue);
          updateData = { birthDate: isoDate };
        }

        await socialApiService.updateOrphan(editingInfo.id, updateData);

        const displayValue = editingInfo.field === 'birthDate'
          ? socialApiService.formatDateRu(socialApiService.parseDateRuToIso(editingValue))
          : editingValue;

        setOrphanStudents(prev => prev.map(s =>
          s.id === editingInfo.id
            ? { ...s, [editingInfo.field]: displayValue }
            : s
        ));
      }
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Ошибка при сохранении изменений');
    }

    setEditingInfo(null);
    setEditingValue('');
  }, [editingInfo, editingValue, disabledStudents, orphanStudents]);

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

  const handleCertificateUpload = useCallback(async (studentId: number, file: File) => {
    try {
      const result = await socialApiService.uploadCertificate(file, studentId);

      if (result.success) {
        const certificates = await socialApiService.getStudentCertificates(studentId);
        
        setDisabledStudents(prev => prev.map(student =>
          student.idStudent === studentId
            ? {
                ...student,
                certificate: {
                  ...student.certificate,
                  images: certificates.map(cert => ({
                    fileId: cert.id,
                    url: socialApiService.getFileUrl(cert.id),
                    fileName: cert.nameFile || `справка_${cert.id}`
                  }))
                }
              }
            : student
        ));
      }
    } catch (error) {
      console.error('Error uploading certificate:', error);
      alert('Ошибка при загрузке справки');
    }
  }, []);

  const handleCertificateDownload = useCallback(async (fileId: number, fileName: string) => {
    try {
      const blob = await socialApiService.downloadFile(fileId);
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Ошибка при скачивании файла');
    }
  }, []);

  const handleCertificateDelete = useCallback((studentId: number, fileId: number) => {
    setConfirmModalConfig({
      title: 'Удаление справки',
      message: 'Вы уверены, что хотите удалить прикрепленную справку? Это действие нельзя отменить.',
      onConfirm: async () => {
        try {
          await socialApiService.deleteCertificate(fileId);
          setDisabledStudents(prev => prev.map(s =>
            s.id === studentId
              ? {
                  ...s,
                  certificate: {
                    ...s.certificate,
                    images: s.certificate.images.filter(img => img.fileId !== fileId)
                  }
                }
              : s
          ));
        } catch (error) {
          console.error('Error deleting certificate:', error);
          alert('Ошибка при удалении файла');
        }
        setConfirmModalOpen(false);
      }
    });
    setConfirmModalOpen(true);
  }, []);

  const handleDownloadAllCertificates = useCallback(async (studentId: number) => {
    const student = disabledStudents.find(s => s.idStudent === studentId);
    if (!student || student.certificate.images.length === 0) return;
    
    try {
      for (const img of student.certificate.images) {
        const blob = await socialApiService.downloadFile(img.fileId);
        saveAs(blob, img.fileName);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Error downloading certificates:', error);
      alert('Ошибка при скачивании справок');
    }
  }, [disabledStudents]);

  const renderCell = useCallback((value: string, type: 'disabled' | 'orphan', id: number, field: string, placeholder?: string) => {
    const isEditing = editingInfo?.type === type && editingInfo?.id === id && editingInfo?.field === field;
    const hasError = validationError?.field === field;

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
          className={`edit-input certificate-textarea ${hasError ? 'validation-error' : ''}`}
          placeholder={placeholder}
          autoFocus
          rows={2}
        />
      );
    }

    if (isEditing) {
      const inputType = (field === 'telephone' || field === 'phone') ? 'tel' : 'text';
      return (
        <input
          type={inputType}
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
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Загрузка и скачивание фото/документов справок для инвалидов</span>
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
                      <button
                        className="reports-action-btn delete-btn-reports"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        ✕
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
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
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
          handleCertificateDelete={handleCertificateDelete}
          handleDownloadAllCertificates={handleDownloadAllCertificates}
          loading={loadingStudents}
        />
      )}
      {showStudentsModal && currentReportType === 'orphans' && (
        <OrphanStudentsModal
          onClose={() => setShowStudentsModal(false)}
          studentSearchTerm={studentSearchTerm}
          setStudentSearchTerm={setStudentSearchTerm}
          filteredOrphanStudents={filteredOrphanStudents}
          renderCell={renderCell}
          loading={loadingStudents}
        />
      )}

      {/* Модальное окно подтверждения удаления */}
      {confirmModalOpen && confirmModalConfig && (
        <>
          <div className="reports-modal-overlay" onClick={() => setConfirmModalOpen(false)} />
          <div className="reports-modal confirm-modal">
            <div className="reports-modal-header">
              <div className="reports-modal-header-content">
                <div className="reports-modal-icon">
                  <span style={{ fontSize: 24, filter: 'brightness(0) invert(1)' }}>⚠</span>
                </div>
                <div>
                  <h3>{confirmModalConfig.title}</h3>
                </div>
              </div>
              <button className="reports-modal-close" onClick={() => setConfirmModalOpen(false)}>✕</button>
            </div>
            <div className="reports-modal-content">
              <p style={{ margin: 0, color: '#475569', fontSize: 15 }}>{confirmModalConfig.message}</p>
            </div>
            <div className="reports-modal-actions">
              <button className="reports-btn-secondary" onClick={() => setConfirmModalOpen(false)}>Отмена</button>
              <button 
                className="reports-confirm-btn" 
                onClick={confirmModalConfig.onConfirm}
                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}
              >
                Удалить
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};