import { useCachedData } from './useCachedData';
import { apiService, Document } from '../services/studentApiService';
import { CACHE_TTL } from '../services/cacheConstants';
import { useCallback, useMemo } from 'react';

export function useStudentDocuments(studentId?: number, forceRefresh = false) {
  const cacheKey = useMemo(() => 
    studentId ? `student_documents_${studentId}` : undefined, 
    [studentId]
  );

  const fetchFn = useCallback(() => {
    if (!studentId) {
      return Promise.resolve([]);
    }
    return apiService.fetchDocumentsByStudent(studentId);
  }, [studentId]);

  return useCachedData<Document[]>(
    cacheKey,
    fetchFn,
    {
      ttl: CACHE_TTL.DOCUMENTS,
      enabled: !!studentId,
      forceRefresh // Передаем параметр принудительного обновления
    }
  );
}

export function useStudentDocumentsByType(studentId?: number, type?: string, forceRefresh = false) {
  const cacheKey = useMemo(() => 
    studentId && type ? `student_documents_${studentId}_${type.toLowerCase().replace(/\s+/g, '_')}` : undefined, 
    [studentId, type]
  );

  const fetchFn = useCallback(() => {
    if (!studentId || !type) {
      return Promise.resolve([]);
    }
    return apiService.getStudentDocumentsByType(studentId, type);
  }, [studentId, type]);

  return useCachedData<Document[]>(
    cacheKey,
    fetchFn,
    {
      ttl: CACHE_TTL.DOCUMENTS,
      enabled: !!studentId && !!type,
      forceRefresh // Передаем параметр принудительного обновления
    }
  );
}

export function useAllDocuments(forceRefresh = false) {
  const fetchFn = useCallback(() => {
    return apiService.getAllDocuments();
  }, []);

  return useCachedData<Document[]>(
    'all_documents',
    fetchFn,
    {
      ttl: CACHE_TTL.DOCUMENTS,
      forceRefresh // Передаем параметр принудительного обновления
    }
  );
}