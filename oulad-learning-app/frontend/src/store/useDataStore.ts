/**
 * Zustand Store quản lý trạng thái dữ liệu toàn cục (sessionId, tên file, tổng số dòng, preview, dark mode).
 * Sử dụng middleware `persist` lưu vào localStorage để không bị mất trạng thái khi tải lại trang.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StudentPreviewRecord } from "@/types";

interface DataStoreState {
  sessionId: string | null;
  filename: string | null;
  totalRows: number;
  previewRows: StudentPreviewRecord[];
  selectedStudentId: number | null;
  darkMode: boolean;
  setSessionData: (payload: {
    sessionId: string;
    filename: string;
    totalRows: number;
    previewRows: StudentPreviewRecord[];
  }) => void;
  setSelectedStudentId: (idStudent: number | null) => void;
  clearSession: () => void;
  toggleDarkMode: () => void;
}

export const useDataStore = create<DataStoreState>()(
  persist(
    (set) => ({
      sessionId: null,
      filename: null,
      totalRows: 0,
      previewRows: [],
      selectedStudentId: null,
      darkMode: false,

      setSessionData: ({ sessionId, filename, totalRows, previewRows }) =>
        set({
          sessionId,
          filename,
          totalRows,
          previewRows,
          selectedStudentId:
            previewRows.length > 0 ? previewRows[0].id_student : null,
        }),

      setSelectedStudentId: (idStudent) =>
        set({ selectedStudentId: idStudent }),

      clearSession: () =>
        set({
          sessionId: null,
          filename: null,
          totalRows: 0,
          previewRows: [],
          selectedStudentId: null,
        }),

      toggleDarkMode: () =>
        set((state) => ({
          darkMode: !state.darkMode,
        })),
    }),
    {
      name: "oulad-learning-analytics-storage",
    }
  )
);
