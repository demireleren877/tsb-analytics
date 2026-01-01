import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ThemeProvider';
import { Layout } from './components/Layout';
import { Companies } from './pages/Companies';
import { CompanyDetail } from './pages/CompanyDetail';
import { Compare } from './pages/Compare';
import { Analytics } from './pages/Analytics';
import { DataDictionary } from './pages/DataDictionary';
import { Subscription } from './pages/Subscription';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/companies" replace />} />
              <Route path="companies" element={<Companies />} />
              <Route path="company/:id" element={<CompanyDetail />} />
              <Route path="compare" element={<Compare />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="dictionary" element={<DataDictionary />} />
              <Route path="subscription" element={<Subscription />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
