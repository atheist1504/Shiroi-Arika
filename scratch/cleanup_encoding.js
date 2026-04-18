const fs = require('fs');
const path = 'c:/Shiroi Arika/src/components/Navbar.js';
let content = fs.readFileSync(path, 'utf8');

// Fix the mangled text
content = content.replace(/Ãƒâ€žÃƒâ€žng nhÃ¡ÂºÂ¬p/g, 'Đăng nhập');
content = content.replace(/Ã„Ã„ng xuáº¾t/g, 'Đăng xuất');
content = content.replace(/Ã„Ã„ng nháº¬p ngay/g, 'Đăng nhập ngay');

fs.writeFileSync(path, content, 'utf8');
console.log('Navbar.js Vietnamese text cleaned up');
