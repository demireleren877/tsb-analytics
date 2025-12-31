import { create } from 'zustand';

interface AppState {
  selectedPeriod: string;
  selectedCompanies: number[];
  setSelectedPeriod: (period: string) => void;
  toggleCompany: (companyId: number) => void;
  clearSelectedCompanies: () => void;
}

export const useStore = create<AppState>((set) => ({
  selectedPeriod: '20253',
  selectedCompanies: [],
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
  toggleCompany: (companyId) =>
    set((state) => ({
      selectedCompanies: state.selectedCompanies.includes(companyId)
        ? state.selectedCompanies.filter((id) => id !== companyId)
        : [...state.selectedCompanies, companyId],
    })),
  clearSelectedCompanies: () => set({ selectedCompanies: [] }),
}));
