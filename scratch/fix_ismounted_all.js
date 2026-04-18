const fs = require('fs');

function fixFile(path, target, replacement) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    if (content.indexOf(target) !== -1) {
        content = content.replace(target, replacement);
        fs.writeFileSync(path, content, 'utf8');
        console.log(`Fixed: ${path}`);
    } else {
        console.log(`Target not found in: ${path}`);
    }
}

// 1. Fix Comments.js
const commentsPath = 'c:/Shiroi Arika/src/components/Comments.js';
// Insert setIsMounted(true) into the useEffect
const commentsTarget = '    fetchComments();\r\n    \r\n    // 🔍 ĐỒNG BỘ COOKIE';
const commentsReplacement = '    fetchComments();\r\n    setIsMounted(true);\r\n    \r\n    // 🔍 ĐỒNG BỘ COOKIE';

// Also try \n version
if (fs.existsSync(commentsPath)) {
    let content = fs.readFileSync(commentsPath, 'utf8');
    if (content.indexOf('setIsMounted(true)') === -1) {
        content = content.replace('fetchComments();', 'fetchComments();\n    setIsMounted(true);');
        fs.writeFileSync(commentsPath, content, 'utf8');
        console.log('Fixed: Comments.js');
    }
}

// 2. Audit other components
const paths = [
    'c:/Shiroi Arika/src/components/CheckIn.js',
    'c:/Shiroi Arika/src/components/LuckyDraw.js',
    'c:/Shiroi Arika/src/components/NotificationBell.js'
];

paths.forEach(p => {
    if (!fs.existsSync(p)) return;
    let content = fs.readFileSync(p, 'utf8');
    if (content.indexOf('setIsMounted(true)') === -1) {
        console.log(`CRITICAL: setIsMounted(true) missing in ${p}. Fixing...`);
        // Find the second to last } or the end of a useEffect
        content = content.replace('}, []);', '  setIsMounted(true);\n  }, []);');
        fs.writeFileSync(p, content, 'utf8');
    } else {
        console.log(`Check passed: ${p}`);
    }
});
