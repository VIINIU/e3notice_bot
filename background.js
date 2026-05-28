// alarm
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('check-notices-alarm', { periodInMinutes: 480 });
    checkAllBoards();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'check-notices-alarm') {
    checkAllBoards();
    }
});

// fetch 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchHTML") {
        fetch(request.url)
            .then(response => {
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return response.text();
            })
            .then(html => sendResponse({ success: true, data: html }))
            .catch(error => sendResponse({ success: false, error: error.message }));
            
    return true; // async
    }
});

// background
const boards = [
    { id: 'eee', name: '중앙대 전자전기 공지', url: 'https://e3home.cau.ac.kr/em/em_1.php' },
    { id: 'disu-all', name: '혁신공유대학 (전체)', url: 'https://www.disu.ac.kr/community/notice' },
    { id: 'disu-cau', name: '혁신공유대학 (중앙대)', url: 'https://www.disu.ac.kr/community/notice?cidx=44' }
];

function checkAllBoards() {
    boards.forEach(board => {
    fetch(board.url)
        .then(response => response.text())
        .then(html => {
        const hrefs = [];
        const regex = /href=["']([^"']+)["']/g;
        let match;
        
        while ((match = regex.exec(html)) !== null) {
            const link = match[1];
            if (link.includes('id=') || link.includes('idx=') || link.includes('cidx=') || link.includes('mode=')) {
            hrefs.push(link);
            }
        }

        const currentSnapshot = hrefs.slice(0, 3).join(',');
        if (!currentSnapshot) return;

        chrome.storage.local.get([board.id], (result) => {
            const previousSnapshot = result[board.id];
            if (previousSnapshot && previousSnapshot !== currentSnapshot) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png', 
                title: board.name,
                message: '새로운 공지사항이 등록되었습니다!',
                priority: 2
            });
            }
            chrome.storage.local.set({ [board.id]: currentSnapshot });
        });
        })
        .catch(error => console.error(`${board.name} 백그라운드 체크 오류:`, error));
    });
}