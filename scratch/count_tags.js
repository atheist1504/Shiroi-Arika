
const fs = require('fs');
const content = fs.readFileSync('c:\\Shiroi Arika\\src\\app\\user\\[userId]\\ProfileClient.jsx', 'utf8');

function countTags(tagName) {
    const openTag = new RegExp('<' + tagName + '[\\s>]', 'g');
    const closeTag = new RegExp('</' + tagName + '>', 'g');
    const selfClosingTag = new RegExp('<' + tagName + '[^>]*/>', 'g');
    
    const openCount = (content.match(openTag) || []).length;
    const closeCount = (content.match(closeTag) || []).length;
    const selfClosingCount = (content.match(selfClosingTag) || []).length;
    
    return { openCount, closeCount, selfClosingCount };
}

console.log('div:', countTags('div'));
console.log('h1:', countTags('h1'));
console.log('h2:', countTags('h2'));
console.log('p:', countTags('p'));
console.log('span:', countTags('span'));
console.log('button:', countTags('button'));
console.log('Link:', countTags('Link'));
console.log('motion.div:', countTags('motion.div'));
