import { SiteRoot } from '@/app/SiteRoot';
import { LangProvider } from '@/i18n';

export default function App() {
  return (
    <LangProvider>
      <SiteRoot />
    </LangProvider>
  );
}
