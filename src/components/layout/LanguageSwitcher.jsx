import { useLanguage } from '@/lib/useLanguage.jsx';
import { languages } from '@/lib/translations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const currentLang = languages[language];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 transition-all duration-200 shadow-sm group">
          <Globe className="w-3.5 h-3.5 text-violet-500 group-hover:text-violet-600" />
          <span className="text-[11px] font-bold text-slate-600 group-hover:text-violet-700 uppercase tracking-wide">
            {language}
          </span>
          <span className="text-sm leading-none">{currentLang?.flag}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 p-1">
        {Object.entries(languages).map(([code, { name, flag }]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLanguage(code)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${
              language === code
                ? 'bg-violet-50 text-violet-700'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="text-base leading-none">{flag}</span>
            <span>{name}</span>
            {language === code && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
