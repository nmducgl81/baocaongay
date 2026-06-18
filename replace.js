const fs = require('fs');

function updateMockData() {
  const path = './services/mockData.ts';
  let content = fs.readFileSync(path, 'utf8');

  content = content.replace(/messageNewCust: \d+,\s*friendZalo: \d+,\s*postSocial: (\d+),\s*postGroup: \d+,/g, (match, postSocial) => {
    return `postSocial: ${postSocial},
      adsCost: 0,
      liveSessions: 0,
      videoPosts: 0,`;
  });

  fs.writeFileSync(path, content);
}

updateMockData();
