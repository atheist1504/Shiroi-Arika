const fs = require('fs');
const path = 'c:/Shiroi Arika/src/components/Navbar.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix Desktop User Area Structure
// We replace the hanging {isMounted && (user ? ( with the proper ternary skeleton
const oldDesktopStart = '{isMounted && (user ? (';
const newDesktopStart = '{!isMounted ? (\n                <div className="w-24 h-8 bg-white/5 animate-pulse rounded-xl"></div>\n              ) : user ? (';

if (content.indexOf(oldDesktopStart) !== -1) {
    content = content.replace(oldDesktopStart, newDesktopStart);
}

// Ensure the closing braces match the new structure
// The old code had )} which was missing one ) if it was isMounted && ( ... )
// But with my new ternary structure {!isMounted ? ( ... ) : user ? ( ... ) : ( ... )}, 
// the end part )} is actually correct to close the last ( and then the { .

// 2. Fix Vietnamese encoding once and for all
content = content.replace(/Ãƒâ€žÃƒâ€žng nhÃ¡ÂºÂ¬p/g, 'Đăng nhập');
content = content.replace(/Ã„Ã„ng xuáº¾t/g, 'Đăng xuất');
content = content.replace(/Ã„Ã„ng nháº¬p ngay/g, 'Đăng nhập ngay');

fs.writeFileSync(path, content, 'utf8');
console.log('Navbar.js restored and fixed successfully');
