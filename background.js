// 1. 익스텐션이 설치되거나 브라우저가 켜질 때 알람 설정
chrome.runtime.onInstalled.addListener(() => {
  // 매일 3회 조회를 위해 8시간(480분)마다 알람 작동
  // ★ 테스트해보고 싶다면 periodInMinutes를 1로 변경하여 1분마다 작동하게 하세요.
  chrome.alarms.create('check-notices-alarm', { periodInMinutes: 480 });
  
  // 설치 직후 초기 1회 실행
  checkAllBoards();
});

// 2. 알람 시간에 맞춰 실행되는 리스너
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'check-notices-alarm') {
    checkAllBoards();
  }
});

// 크롤링 대상 게시판 정의
const boards = [
  { id: 'eee', name: '중앙대 전자전기 공지', url: 'https://e3home.cau.ac.kr/em/em_1.php' },
  { id: 'disu-all', name: '혁신공유대학 (전체)', url: 'https://www.disu.ac.kr/community/notice' },
  { id: 'disu-cau', name: '혁신공유대학 (중앙대)', url: 'https://www.disu.ac.kr/community/notice?cidx=44' }
];

// 3. 전체 게시판 체크 함수
function checkAllBoards() {
  boards.forEach(board => {
    fetch(board.url)
      .then(response => response.text())
      .then(html => {
        // HTML 내부에서 게시글 상세 페이지 링크 패턴 추출
        const hrefs = [];
        const regex = /href=["']([^"']+)["']/g;
        let match;
        
        while ((match = regex.exec(html)) !== null) {
          const link = match[1];
          // 일반 메뉴 링크를 제외하고 게시글 본문 링크일 확률이 높은 주소만 수집
          if (link.includes('id=') || link.includes('idx=') || link.includes('cidx=') || link.includes('mode=')) {
            hrefs.push(link);
          }
        }

        // 상위 3개 게시글 링크를 합쳐 고유한 스냅샷 문자열 생성
        const currentSnapshot = hrefs.slice(0, 3).join(',');
        if (!currentSnapshot) return;

        // 크롬 로컬 저장소에 저장되어 있던 이전 스냅샷 불러오기
        chrome.storage.local.get([board.id], (result) => {
          const previousSnapshot = result[board.id];

          // 이전 데이터가 존재하고, 새로 가져온 스냅샷과 일치하지 않으면 '새 글'로 판단
          if (previousSnapshot && previousSnapshot !== currentSnapshot) {
            sendNotification(board.name, '새로운 공지사항이 등록되었습니다! 확인해보세요.');
          }

          // 현재 상태를 다음 비교를 위해 저장
          chrome.storage.local.set({ [board.id]: currentSnapshot });
        });
      })
      .catch(error => console.error(`${board.name} 체크 중 오류:`, error));
  });
}

// 4. 크롬 시스템 알림 발송 함수
function sendNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png', // 알림창에 표시될 아이콘 파일명
    title: title,
    message: message,
    priority: 2
  });
}

// popup.js에서 보낸 데이터 통신(fetch) 요청을 대신 수행하는 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchHTML") {
    fetch(request.url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return response.text();
      })
      .then(html => sendResponse({ success: true, data: html }))
      .catch(error => sendResponse({ success: false, error: error.message }));
      
    // 비동기 응답(fetch 완료 후 sendResponse 실행)을 위해 반드시 true 반환
    return true; 
  }
});