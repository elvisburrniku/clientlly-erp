import { ChevronDown, LogOut, Settings as SettingsIcon, User as UserIcon, LogIn, Coffee, CirclePower } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';
import { useLanguage } from "@/lib/useLanguage";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "attendance_status";

export default function TopNav() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [attendance, setAttendance] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "idle"
  );
  const setStatus = (s) => { setAttendance(s); localStorage.setItem(STORAGE_KEY, s); };

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ")[0][0].toUpperCase()
    : "U";

  /* status dot color */
  const dotColor = attendance === "checked_in"
    ? "bg-emerald-400"
    : attendance === "on_break"
    ? "bg-amber-400"
    : "bg-slate-300";

  return (
    <>
    <style>{`
      @keyframes glowPulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
        50%      { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
      }
      @keyframes coffeeWobble {
        0%,100% { transform: rotate(0deg); }
        25%      { transform: rotate(-10deg); }
        75%      { transform: rotate(10deg); }
      }
      @keyframes slideIn {
        from { opacity:0; transform: translateX(-6px); }
        to   { opacity:1; transform: translateX(0); }
      }
    `}</style>
    <header className="h-16 border-b border-border bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">

      {/* ── Attendance widget — same position as before, wider style ── */}
      <div className="flex items-center">
        {/* container */}
        <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-10 w-[264px]">
          {/* left status strip */}
          <div className={cn(
            "w-[3px] self-stretch shrink-0 transition-colors duration-300",
            attendance === "checked_in" ? "bg-emerald-400"
            : attendance === "on_break" ? "bg-amber-400"
            : "bg-slate-200"
          )} />

          {/* buttons row */}
          <div className="flex flex-1 gap-0.5 px-1">

            {/* Hyrje */}
            <button
              onClick={() => setStatus("checked_in")}
              disabled={attendance !== "idle"}
              data-testid="button-attendance-checkin"
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-7 rounded-xl text-[11px] font-bold transition-all duration-200",
                attendance === "idle"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
                  : attendance === "checked_in"
                  ? "text-emerald-400 bg-emerald-50 cursor-default"
                  : "text-slate-300 cursor-not-allowed"
              )}
              style={attendance === "idle" ? { animation: "glowPulse 2.5s ease-in-out infinite" } : {}}
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Hyrje</span>
            </button>

            {/* Pauzë / Vazhdo */}
            <button
              onClick={() => setStatus(attendance === "on_break" ? "checked_in" : "on_break")}
              disabled={attendance === "idle"}
              data-testid="button-attendance-pause"
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-7 rounded-xl text-[11px] font-bold transition-all duration-200",
                attendance === "on_break"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm hover:from-amber-500 hover:to-amber-600"
                  : attendance === "checked_in"
                  ? "text-amber-600 hover:bg-amber-50"
                  : "text-slate-300 cursor-not-allowed"
              )}
            >
              <Coffee
                className="w-3.5 h-3.5 shrink-0"
                style={attendance === "on_break" ? { animation: "coffeeWobble 1.5s ease-in-out infinite" } : {}}
              />
              <span>{attendance === "on_break" ? "Vazhdo" : "Pauzë"}</span>
            </button>

            {/* Dalje */}
            <button
              onClick={() => setStatus("idle")}
              disabled={attendance === "idle"}
              data-testid="button-attendance-checkout"
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-7 rounded-xl text-[11px] font-bold transition-all duration-200",
                attendance !== "idle"
                  ? "text-rose-500 hover:bg-rose-50"
                  : "text-slate-300 cursor-not-allowed"
              )}
            >
              <CirclePower className="w-3.5 h-3.5 shrink-0" />
              <span>Dalje</span>
            </button>
          </div>

          {/* status dot top-right */}
          <span className={cn(
            "absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full transition-colors duration-300",
            dotColor
          )}
            style={attendance !== "idle" ? { animation: "glowPulse 2s ease-in-out infinite" } : {}}
          />
        </div>

        {/* "nuk je kyçur" hint — only when idle */}
        {attendance === "idle" && (
          <div className="ml-2 flex items-center gap-1" style={{ animation: "slideIn 0.3s ease" }}>
            <span className="w-1 h-1 rounded-full bg-amber-400" style={{ animation: "glowPulse 2s infinite" }} />
            <span className="text-[10px] font-semibold text-amber-600 whitespace-nowrap">Nuk je kyçur</span>
          </div>
        )}
      </div>

      {/* ── Right side: language + bell + user ── */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="button-user-menu"
              className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 transition-all duration-200 shadow-sm group"
            >
              <Avatar className="w-6 h-6 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-[11px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <p className="text-[13px] font-semibold text-slate-800 hidden sm:block" data-testid="text-user-name">
                {user?.full_name || "User"}
              </p>
              <span data-testid="text-user-role" className="hidden">{user?.role || "staff"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-violet-500 transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-item-profile">
              <UserIcon className="w-4 h-4 mr-2" />
              {t('profile') || 'Profile'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-item-settings">
              <SettingsIcon className="w-4 h-4 mr-2" />
              {t('settings') || 'Settings'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-destructive" data-testid="menu-item-logout">
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout') || 'Log out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </>
  );
}
