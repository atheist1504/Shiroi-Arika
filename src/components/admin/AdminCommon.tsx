import React from 'react';

/**
 * SHARED ADMIN UI COMPONENTS (TypeScript)
 * Inspired by professional dashboards
 */

interface AdminCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const AdminCard: React.FC<AdminCardProps> = ({ title, children, icon, rightElement }) => (
  <div className="bg-[#141814] rounded-3xl border border-[#2a332a] shadow-2xl overflow-hidden mb-8">
    <div className="px-8 py-6 border-b border-[#2a332a] flex justify-between items-center bg-black/20">
      <div className="flex items-center gap-3">
        {icon && <div className="text-[#4caf50]">{icon}</div>}
        <h2 className="text-lg font-black uppercase tracking-widest text-white">{title}</h2>
      </div>
      {rightElement}
    </div>
    <div className="p-8">
      {children}
    </div>
  </div>
);

interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AdminInput: React.FC<AdminInputProps> = ({ label, error, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-[#4caf50]/70 uppercase tracking-widest block pl-1">
      {label}
    </label>
    <input
      {...props}
      className={`w-full bg-black/50 border ${error ? 'border-red-500' : 'border-[#2a332a]'} p-3 rounded-xl text-xs font-bold text-white focus:border-[#4caf50] transition-all outline-none placeholder:text-gray-600 shadow-inner`}
    />
    {error && <p className="text-[9px] text-red-500 font-bold uppercase pl-1">{error}</p>}
  </div>
);

interface AdminSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string | number; label: string }[];
}

export const AdminSelect: React.FC<AdminSelectProps> = ({ label, options, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-[#4caf50]/70 uppercase tracking-widest block pl-1">
      {label}
    </label>
    <select
      {...props}
      className="w-full bg-black/50 border border-[#2a332a] p-3 rounded-xl text-xs font-bold text-white focus:border-[#4caf50] transition-all outline-none shadow-inner cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

interface AdminTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const AdminTextarea: React.FC<AdminTextareaProps> = ({ label, error, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-[#4caf50]/70 uppercase tracking-widest block pl-1">
      {label}
    </label>
    <textarea
      {...props}
      className={`w-full bg-black/50 border ${error ? 'border-red-500' : 'border-[#2a332a]'} p-4 rounded-xl text-xs font-bold text-white focus:border-[#4caf50] transition-all outline-none placeholder:text-gray-600 shadow-inner resize-none`}
    />
    {error && <p className="text-[9px] text-red-500 font-bold uppercase pl-1">{error}</p>}
  </div>
);

interface AdminTagProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const AdminTag: React.FC<AdminTagProps> = ({ label, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
      isActive
        ? "bg-[#4caf50] border-[#4caf50] text-[#0a0c0a] shadow-[0_0_15px_rgba(76,175,80,0.3)]"
        : "bg-transparent border-[#2a332a] text-gray-500 hover:border-gray-500 hover:text-gray-300"
    }`}
  >
    {label}
  </button>
);

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost';
  icon?: React.ReactNode;
}

export const AdminButton: React.FC<AdminButtonProps> = ({ variant = 'primary', icon, children, ...props }) => {
  const styles = {
    primary: 'bg-gradient-to-r from-[#2e7d32] to-[#4caf50] text-[#0a0c0a] hover:brightness-110 active:scale-95',
    danger: 'bg-red-600/10 border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white active:scale-95',
    ghost: 'bg-white/5 border border-white/5 text-gray-400 hover:text-white active:scale-95',
  };

  return (
    <button
      {...props}
      className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {icon}
      {children}
    </button>
  );
};
