'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminCard, AdminButton } from "@/components/admin/AdminCommon";
import { getReportsAction, updateReportStatusAction } from "@/lib/actions";
import Link from "next/link";

export default function AdminReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const res = await getReportsAction();
    if (res.success) {
      setReports(res.reports || []);
    } else {
      setMessage({ type: 'error', text: `LỖI TẢI BÁO CÁO: ${res.error}` });
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (reportId: string, status: string) => {
    setUpdatingId(reportId);
    const res = await updateReportStatusAction(reportId, status);
    if (res.success) {
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
      setMessage({ type: 'success', text: 'ĐÃ CẬP NHẬT TRẠNG THÁI! 🍀' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: `THẤT BẠI: ${res.error}` });
    }
    setUpdatingId(null);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'CHỜ XỬ LÝ', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case 'fixed': return { label: 'ĐÃ SỬA', color: 'text-[#4caf50] bg-[#4caf50]/10 border-[#4caf50]/20' };
      case 'ignored': return { label: 'BỎ QUA', color: 'text-gray-500 bg-gray-500/10 border-gray-500/20' };
      default: return { label: status, color: 'text-white bg-white/10' };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'image_broken': return 'ẢNH HỎNG';
      case 'wrong_translation': return 'DỊCH SAI';
      case 'wrong_order': return 'NHẦM THỨ TỰ';
      case 'other': return 'LỖI KHÁC';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between mb-10">
           <h1 className="text-2xl font-black uppercase tracking-[0.3em] flex items-center gap-3">
              QUẢN LÝ BÁO CÁO LỖI <span className="text-red-500 animate-pulse">🚩</span>
           </h1>
           <AdminButton variant="ghost" onClick={() => router.back()}>QUAY LẠI</AdminButton>
        </div>

        {message && (
          <div className={`mb-10 p-4 rounded-2xl border ${
            message.type === 'error' ? 'bg-red-500/5 border-red-500/20 text-red-500' : 
            'bg-[#4caf50]/5 border-[#4caf50]/20 text-[#4caf50]'
          } text-[10px] text-center font-black uppercase tracking-[0.2em] shadow-xl`}>
            {message.text}
          </div>
        )}

        <AdminCard title="Danh sách báo cáo" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2zM14 4v4h4"/></svg>}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2a332a]">
                  <th className="py-4 px-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Thời gian</th>
                  <th className="py-4 px-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Truyện / Chương</th>
                  <th className="py-4 px-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Loại lỗi</th>
                  <th className="py-4 px-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Người gửi</th>
                  <th className="py-4 px-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Trạng thái</th>
                  <th className="py-4 px-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center animate-pulse text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Đang truy vấn dữ liệu báo cáo...</td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Hệ thống chưa ghi nhận báo cáo nào 🍀</td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const statusInfo = getStatusLabel(report.status);
                    return (
                      <tr key={report.id} className="border-b border-[#2a332a] hover:bg-white/[0.02] transition-colors group">
                        <td className="py-5 px-2">
                           <p className="text-[10px] font-bold text-gray-400">{new Date(report.created_at).toLocaleDateString('vi-VN')}</p>
                           <p className="text-[9px] text-gray-600">{new Date(report.created_at).toLocaleTimeString('vi-VN')}</p>
                        </td>
                        <td className="py-5 px-2">
                           <Link href={`/read/${report.chapter_id}`} target="_blank" className="hover:text-[#4caf50] transition-colors">
                              <p className="text-xs font-black uppercase truncate max-w-[200px]">{report.mangas?.title || '???'}</p>
                              <p className="text-[10px] font-bold text-gray-500 uppercase">Chương {report.chapters?.chapter_number || '???'}</p>
                           </Link>
                        </td>
                        <td className="py-5 px-2">
                           <span className="text-[9px] font-black text-amber-500/80 uppercase">{getTypeLabel(report.type)}</span>
                           {report.description && (
                             <p className="text-[9px] text-gray-500 mt-1 line-clamp-2 italic">"{report.description}"</p>
                           )}
                        </td>
                        <td className="py-5 px-2">
                           <p className="text-[10px] font-black text-blue-400 uppercase">{report.shiroi_users?.username || 'GUEST'}</p>
                        </td>
                        <td className="py-5 px-2">
                           <span className={`px-2.5 py-1 rounded-md text-[8px] font-black border ${statusInfo.color}`}>
                              {statusInfo.label}
                           </span>
                        </td>
                        <td className="py-5 px-2 text-center">
                           <div className="flex items-center justify-center gap-2">
                              {report.status !== 'fixed' && (
                                <button 
                                  onClick={() => handleUpdateStatus(report.id, 'fixed')}
                                  disabled={!!updatingId}
                                  className="p-2 bg-[#4caf50]/10 text-[#4caf50] hover:bg-[#4caf50] hover:text-black rounded-lg transition-all"
                                  title="Đã sửa"
                                >
                                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                                </button>
                              )}
                              {report.status === 'pending' && (
                                <button 
                                  onClick={() => handleUpdateStatus(report.id, 'ignored')}
                                  disabled={!!updatingId}
                                  className="p-2 bg-gray-500/10 text-gray-500 hover:bg-gray-500 hover:text-white rounded-lg transition-all"
                                  title="Bỏ qua"
                                >
                                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                              )}
                           </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>

      </div>
    </div>
  );
}
