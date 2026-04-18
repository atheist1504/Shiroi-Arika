const fs = require('fs');
const path = 'c:/Shiroi Arika/src/components/Navbar.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix the desktop structure properly
// Current bad state has {isMounted && (user ? ( ... ) : ( ... ))}
// But it's missing the closing ) for isMounted && (

// Let's replace the whole area from "flex items-center gap-4 lg:gap-6 shrink-0 ml-auto lg:ml-0" 
// to the next "</div>\n          </div>"

const userAreaRegex = /<div className="flex items-center gap-4 lg:gap-6 shrink-0 ml-auto lg:ml-0">[\s\S]+?<\/div>\s+<\/div>/;

const cleanUserArea = `<div className="flex items-center gap-4 lg:gap-6 shrink-0 ml-auto lg:ml-0">
              {!isMounted ? (
                <div className="w-24 h-8 bg-white/5 animate-pulse rounded-xl"></div>
              ) : user ? (
                 <div className="flex items-center gap-4 animate-fade-in py-2">
                    
                    {/* ADMIN Ä Ä‚NG TRUYá»†N */}
                    {(user?.username?.toLowerCase().includes('admin') || user?.display_name?.toLowerCase().includes('quáº£n trá»‹')) && (
                       <Link href="/admin/create-manga" className="hidden lg:flex items-center px-4 py-2 bg-[#4caf50] text-[#0a0c0a] rounded-xl font-black text-[9px] uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-lg shadow-[#4caf50]/10">
                          Ä Ä‚NG TRUYá»†N
                       </Link>
                    )}

                    <div className="flex items-center gap-4 border-l border-white/5 pl-6">
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <span className="bg-[#4caf50]/20 text-[#4caf50] text-[8px] font-black px-1.5 py-0.5 rounded-lg border border-[#4caf50]/20 italic">
                                LVL {calculateLevel(user.xp)}
                            </span>
                            <span className="text-[11px] text-white font-bold uppercase tracking-widest truncate max-w-[100px]">{user.display_name || user.username}</span>
                         </div>
                         <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#4caf50]" style={{ width: \`\${calculateProgress(user.xp)}%\` }}></div>
                         </div>
                      </div>

                      <div className="flex items-center gap-1">
                          <NotificationBell />
                          <Link href="/profile" className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 hover:border-[#4caf50]/50 transition-all bg-[#141814] shadow-xl">
                              <img src={user.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png'} className="w-full h-full object-cover" alt="Avatar" />
                          </Link>
                      </div>

                      <button 
                        onClick={handleLogout}
                        className="p-2 text-gray-700 hover:text-red-500 transition-colors"
                        title="Ä Äƒng xuáº¥t"
                      >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                      </button>
                    </div>
                 </div>
              ) : (
                <Link 
                  href="/login" 
                  className="px-6 py-2.5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-xl hover:scale-105 transition-all text-[10px] uppercase tracking-wider"
                >
                  Ä Äƒng nháº­p
                </Link>
              )}
            </div>`;

content = content.replace(userAreaRegex, cleanUserArea);

// 2. Fix mangled encoding logic by looking for typical sequences
content = content.replace(/Ãƒâ€žÃƒâ€žng nhÃ¡ÂºÂ¬p/g, 'Đăng nhập');
content = content.replace(/Ã„Ã„ng xuáº¾t/g, 'Đăng xuất');
content = content.replace(/Ã„Ã„ng nháº¬p ngay/g, 'Đăng nhập ngay');
content = content.replace(/Ã„Ã„ng nháº­p/g, 'Đăng nhập'); // Another variation
content = content.replace(/Ã„Ã„ng xuáº¥t/g, 'Đăng xuất'); // Another variation
content = content.replace(/Ã„Ã„ng nháº¬p/g, 'Đăng nhập');

// Fix any other mangled artifacts remaining
content = content.replace(/Ä Ä‚NG TRUYá»†N/g, 'ĐĂNG TRUYỆN');
content = content.replace(/quáº£n trá»‹/g, 'quản trị');
content = content.replace(/Ä Äƒng xuáº¥t/g, 'Đăng xuất');
content = content.replace(/Táº¦NG 2/g, 'TẦNG 2');
content = content.replace(/CHá»ˆ GIá»® Ä Iá»‚M DANH/g, 'CHỜ GIỮ ĐIỂM DANH');
content = content.replace(/TÃŒM KIáº¾M/g, 'TÌM KIẾM');
content = content.replace(/YÃŠU Cáº¦U/g, 'YÊU CẦU');
content = content.replace(/BÃ¡o cÃ¡o/g, 'Báo cáo');
content = content.replace(/Nhiá»‡m vá»¥/g, 'Nhiệm vụ');

fs.writeFileSync(path, content, 'utf8');
console.log('Navbar.js super-definitive fix applied');
