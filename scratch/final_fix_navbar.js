const fs = require('fs');
const path = 'c:/Shiroi Arika/src/components/Navbar.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix Desktop User Area (The cutoff part)
const desktopTarget = '              ) : (\r\n                <Link \r\n                  href="/login" \r\n                  className="px-6 py-2.5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-xl hover:scale-105 transition\r\n\r\n          {/*';
const desktopReplacement = '              ) : (\r\n                <Link \r\n                  href="/login" \r\n                  className="px-6 py-2.5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-xl hover:scale-105 transition-all text-[10px] uppercase tracking-wider"\r\n                >\r\n                  Ä Ã„ng nháº¬p\r\n                </Link>\r\n              )}\r\n            </div>\r\n          </div>\r\n\r\n          {/*';

// Try both \r\n and \n
if (content.indexOf('hover:scale-105 transition\r\n\r\n') !== -1) {
    content = content.replace(desktopTarget, desktopReplacement);
} else {
    content = content.replace(
        '              ) : (\n                <Link \n                  href="/login" \n                  className="px-6 py-2.5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-xl hover:scale-105 transition\n\n          {/*',
        '              ) : (\n                <Link \n                  href="/login" \n                  className="px-6 py-2.5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-xl hover:scale-105 transition-all text-[10px] uppercase tracking-wider"\n                >\n                  Ã„Ã„ng nháº¬p\n                </Link>\n              )}\n            </div>\n          </div>\n\n          {/*'
    );
}

// 2. Clean up Mobile Menu User Area (Fix braces/indentation)
const mobileTarget = '                      Ä Ã„ng xuáº¾t\r\n                   </button>\r\n                ) : (\r\n                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-center p-4 bg-[#4caf50] text-[#0a0c0a] rounded-2xl font-bold">\r\n                    Ä Ã„ng nháº¬p ngay\r\n                  </Link>\r\n                  )\r\n                ) : (';

const mobileReplacement = '                      Ä Ã„ng xuáº¾t\r\n                   </button>\r\n                ) : (\r\n                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-center p-4 bg-[#4caf50] text-[#0a0c0a] rounded-2xl font-bold">\r\n                    Ä Ã„ng nháº¬p ngay\r\n                  </Link>\r\n                )\r\n              ) : (';

if (content.indexOf(mobileTarget) !== -1) {
    content = content.replace(mobileTarget, mobileReplacement);
} else {
    content = content.replace(
        '                      Ã„Ã„ng xuáº¾t\n                   </button>\n                ) : (\n                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-center p-4 bg-[#4caf50] text-[#0a0c0a] rounded-2xl font-bold">\n                    Ã„Ã„ng nháº¬p ngay\n                  </Link>\n                  )\n                ) : (',
        '                      Ã„Ã„ng xuáº¾t\n                   </button>\n                ) : (\n                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-center p-4 bg-[#4caf50] text-[#0a0c0a] rounded-2xl font-bold">\n                    Ã„Ã„ng nháº¬p ngay\n                  </Link>\n                )\n              ) : ('
    );
}

fs.writeFileSync(path, content, 'utf8');
console.log('Navbar.js final syntax fix applied');
