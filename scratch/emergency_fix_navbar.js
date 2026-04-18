const fs = require('fs');
const path = 'c:/Shiroi Arika/src/components/Navbar.js';
let content = fs.readFileSync(path, 'utf8');

// The botched part looks like this:
/*
              ))}
            </div>
-all text-[10px] uppercase tracking-wider"
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
*/

// I will find the botched sequence and remove it.
// It seems my first multi_replace failed partially but left artifacts.

// Let's use a very specific replacement to clean up.
// I'll look for the part where it repeats the "Đăng nhập" link incorrectly.

// From the cat output:
/*
                </Link>
              ))}
            </div>
-all text-[10px] uppercase tracking-wider"
                >
                  ?ng nh-p
                </Link>
              )}
            </div>
          </div>
*/

content = content.replace(
    '              ))}\r\n            </div>\r\n-all text-[10px] uppercase tracking-wider"\r\n                >\r\n                  ?ng nh-p\r\n                </Link>\r\n              )}\r\n            </div>\r\n          </div>',
    '              ))}\r\n            </div>\r\n          </div>'
);

// Try with \n
if (content.indexOf('-all text-[10px]') === -1) {
    // Maybe it's not and-all but just text
}

// Safer approach: search for the specific stray string and delete up to the next </div></div>
const stray = /-all text-\[10px\] uppercase tracking-wider"[\s\S]+?<\/Link>\s+\)\}\s+<\/div>\s+<\/div>/;
content = content.replace(stray, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Navbar.js emergency fix applied');
