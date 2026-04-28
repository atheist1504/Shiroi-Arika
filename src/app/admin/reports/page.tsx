'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminCard, AdminButton } from "@/components/admin/AdminCommon";
import { getReportsAction, updateReportStatusAction, getReportMessagesAction, sendReportMessageAction, deleteResolvedReportsAction } from "@/lib/actions";
import Link from "next/link";

interface User {
  id: string;
  username: string;
  role: string;
  display_name?: string;
}

interface Report {
  id: string;
  manga_id: string;
  chapter_id: string;
  user_id: string;
  type: string;
  description: string;
  status: string;
  created_at: string;
  mangas?: { title: string };
  chapters?: { chapter_number: number | string };
  shiroi_users?: { username: string };
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newChatMsg, setNewChatMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Cleanup handler
  const handleCleanup = async (days: number | null) => {
    if (!confirm(days ? `Xóa các báo cáo đã xử lý cũ hơn ${days} ngày?` : 'Xóa tất cả báo cáo đã xử lý?')) return;
    setLoading(true);
    const res = await deleteResolvedReportsAction(days);
    if (res.success) {
      setMessage({ type: 'success', text: 'DỌN DẸP THÀNH CÔNG! 🍀' });
      fetchReports();
    } else {
      setMessage({ type: 'error', text: `THẤT BẠI: ${res.error}` });
      setLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, selectedReport]);

  useEffect(() => {
    const stored = localStorage.getItem('shiroi_user');
    if (stored) {
      const parsedUser = JSON.parse(stored);
      setUser(parsedUser);
      
      // 🛡️ SECURITY GUARD: Kiểm tra quyền Admin ngay lập tức 🍀
      const isAdmin = parsedUser.role === 'admin' || parsedUser.username?.toLowerCase() === 'atheist1504';
      if (!isAdmin) {
          router.replace('/');
          return;
      }
    } else {
      router.replace('/login');
      return;
    }
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const res = await getReportsAction(true);
    if (res.success) {
      setReports((res.reports as any) || []);
    } else {
      setMessage({ type: 'error', text: `LỖI TẢI BÁO CÁO: ${res.error}` });
      // Nếu Server trả về lỗi chưa đăng nhập hoặc không có quyền, đá về Home
      if (res.error?.includes("đăng nhập") || res.error?.includes("quyền")) {
          router.replace('/');
      }
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
      case 'ignored': return { label: 'KHÔNG LỖI', color: 'text-gray-500 bg-gray-500/10 border-gray-500/20' };
      default: return { label: status, color: 'text-white bg-white/10' };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'image_broken': return 'ẢNH HỎNG';
      case 'wrong_translation': return 'DỊCH SAI';
      case 'wrong_order': return 'NHẦM THỨ TỰ';
      case 'platform_bug': return 'LỖI HỆ THỐNG';
      case 'account_issue': return 'LỖI TÀI KHOẢN';
      case 'feature_suggestion': return 'GÓP Ý';
      case 'content_error': return 'LỖI NỘI DUNG';
      case 'other': return 'LỖI KHÁC';
      default: return type?.toUpperCase() || 'BÁO CÁO';
    }
  };

  const openChat = async (report: Report) => {
      setSelectedReport(report);
      setLoadingChat(true);
      const res = await getReportMessagesAction(report.id);
      if (res.success) setChatMessages(res.messages || []);
      setLoadingChat(false);
  };

  const handleSendChat = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newChatMsg.trim() || !selectedReport) return;
      setIsSending(true);
      const res = await sendReportMessageAction(selectedReport.id, newChatMsg);
      if (res.success) {
          setNewChatMsg('');
          const updated = await getReportMessagesAction(selectedReport.id);
          if (updated.success) setChatMessages(updated.messages || []);
      }
      setIsSending(false);
  };

  const isAdmin = user?.role === 'admin' || user?.username?.toLowerCase() === 'atheist1504';

  const filteredReports = reports.filter(r => activeTab === 'pending' ? r.status === 'pending' : r.status !== 'pending');
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const currentReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
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

        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
           <div className="flex bg-white/5 rounded-xl p-1">
             <button 
               onClick={() => setActiveTab('pending')} 
               className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-[#4caf50] text-black shadow-lg shadow-[#4caf50]/20' : 'text-gray-500 hover:text-white'}`}
             >
                Chưa xử lý 🔴
             </button>
             <button 
               onClick={() => setActiveTab('resolved')} 
               className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'resolved' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
             >
                Đã xử lý 🟢
             </button>
           </div>
           
           <div className="flex gap-2">
              <button 
                onClick={() => handleCleanup(3)}
                className="px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-black rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Xóa cũ &gt; 3 ngày
              </button>
              <button 
                onClick={() => handleCleanup(null)}
                className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Dọn tất cả Đã Xử Lý
              </button>
           </div>
        </div>

        <AdminCard title={`Danh sách báo cáo (${filteredReports.length})`} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2zM14 4v4h4"/></svg>}>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
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
                ) : currentReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">{activeTab === 'pending' ? 'Không có báo cáo nào đang chờ xử lý 🍀' : 'Chưa có báo cáo nào được xử lý'}</td>
                  </tr>
                ) : (
                  currentReports.map((report) => {
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
                               {isAdmin && report.status !== 'fixed' && (
                                 <button 
                                   onClick={() => handleUpdateStatus(report.id, 'fixed')}
                                   disabled={!!updatingId}
                                   className="p-2 bg-[#4caf50]/10 text-[#4caf50] hover:bg-[#4caf50] hover:text-black rounded-lg transition-all"
                                   title="Đã sửa"
                                 >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                                 </button>
                               )}
                               {isAdmin && report.status === 'pending' && (
                                 <button 
                                   onClick={() => handleUpdateStatus(report.id, 'ignored')}
                                   disabled={!!updatingId}
                                   className="p-2 bg-gray-500/10 text-gray-500 hover:bg-gray-500 hover:text-white rounded-lg transition-all"
                                   title="Bỏ qua"
                                 >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                 </button>
                               )}
                               <button 
                                 onClick={() => openChat(report)}
                                 className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                                 title="Chat hỗ trợ"
                               >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                               </button>
                           </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-white/5">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#4caf50] hover:text-black transition-all">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                   TRANG {currentPage} / {totalPages}
                </span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#4caf50] hover:text-black transition-all">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
          )}
        </AdminCard>

        {/* 💬 CHAT OVERLAY 🍀 */}
        {selectedReport && (
            <div className="fixed inset-0 z-[100] flex items-center justify-end sm:p-6 pointer-events-none">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setSelectedReport(null)} />
                <div className="w-full sm:w-[450px] h-full sm:h-[80vh] bg-[#0c0f0c] border-l sm:border border-white/10 sm:rounded-[32px] shadow-2xl flex flex-col relative z-10 pointer-events-auto animate-in slide-in-from-right duration-300">
                    
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent">
                        <div>
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Hỗ trợ khách hàng 🛡️</p>
                            <h3 className="text-sm font-black text-white uppercase truncate max-w-[250px]">{selectedReport.mangas?.title || 'Hệ thống'}</h3>
                        </div>
                        <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>

                    {/* Chat Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/20">
                        {/* Initial Report */}
                        <div className="bg-white/5 p-5 rounded-[24px] border border-white/5">
                            <p className="text-[8px] font-black text-gray-500 uppercase mb-2">Nội dung báo cáo:</p>
                            <p className="text-[11px] text-gray-300 leading-relaxed italic">"{selectedReport.description}"</p>
                            <p className="text-[8px] text-gray-600 mt-2 text-right">{new Date(selectedReport.created_at).toLocaleString('vi-VN')}</p>
                        </div>

                        {chatMessages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.is_admin_reply ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] p-4 rounded-[22px] ${
                                    msg.is_admin_reply 
                                    ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20' 
                                    : 'bg-[#1a1f1a] text-gray-200 border border-white/5 rounded-tl-none'
                                }`}>
                                    <p className="text-[11px] leading-relaxed">{msg.message}</p>
                                </div>
                                <span className="text-[7px] text-gray-600 mt-1 uppercase font-bold px-2">
                                    {msg.is_admin_reply ? 'Bạn' : selectedReport.shiroi_users?.username || 'User'} • {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                        {loadingChat && <p className="text-center py-4 text-[9px] font-black text-blue-500 animate-pulse uppercase">Đang triệu hồi tin nhắn...</p>}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Footer */}
                    <form onSubmit={handleSendChat} className="p-4 bg-black/40 border-t border-white/5 flex gap-2">
                        <input 
                            type="text" 
                            value={newChatMsg}
                            onChange={(e) => setNewChatMsg(e.target.value)}
                            placeholder="Viết phản hồi cho thành viên..."
                            className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500 transition-all"
                        />
                        <button 
                            type="submit" 
                            disabled={isSending || !newChatMsg.trim()}
                            className="px-6 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 disabled:opacity-30 active:scale-95 transition-all"
                        >
                            {isSending ? '...' : 'GỬI'}
                        </button>
                    </form>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
