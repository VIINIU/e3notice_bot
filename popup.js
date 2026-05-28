document.addEventListener('DOMContentLoaded', () => {
  // 1. 토글(아코디언) UI 설정
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const targetList = document.getElementById(targetId);
      const icon = header.querySelector('.icon');
      
      if (targetList.style.display === 'none') {
        targetList.style.display = 'block';
        icon.textContent = '▼';
      } else {
        targetList.style.display = 'none';
        icon.textContent = '▶';
      }
    });
  });

  // 2. 크롤링 실행
  fetchBoardData('https://e3home.cau.ac.kr/em/em_1.php', 'eee-list');
  fetchBoardData('https://www.disu.ac.kr/community/notice', 'disu-all-list');
  fetchBoardData('https://www.disu.ac.kr/community/notice?cidx=44', 'disu-cau-list');
});

// 공통 게시판 크롤링 함수
function fetchBoardData(url, listId) {
  const listElement = document.getElementById(listId);

  fetch(url)
    .then(response => response.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // 게시글 행 선택 (대부분의 게시판은 table tr 또는 ul li 구조를 가짐)
      // 사이트에 맞춰 'table tr' 또는 'ul.board-list li' 등으로 수정이 필요할 수 있습니다.
      const rows = doc.querySelectorAll('table tr'); 
      const parsedItems = [];

      rows.forEach(row => {
        if (row.querySelector('th')) return; // 헤더 제외

        const linkElement = row.querySelector('a');
        if (!linkElement || linkElement.innerText.trim() === '') return;

        const title = linkElement.innerText.trim();
        const href = new URL(linkElement.getAttribute('href'), url).href;
        
        // 행 전체 텍스트에서 날짜(YYYY-MM-DD 또는 YY.MM.DD 형식) 정규식 추출
        const rowText = row.innerText;
        const dateMatch = rowText.match(/(\d{2,4})[-./](\d{1,2})[-./](\d{1,2})/);
        
        let dateObj = new Date(0); // 날짜가 없으면 가장 오래된 시간으로 초기화
        let dateStr = "";

        if (dateMatch) {
          let [_, y, m, d] = dateMatch;
          if (y.length === 2) y = '20' + y; // YY 형식을 YYYY로 변환
          dateObj = new Date(y, m - 1, d);
          dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        parsedItems.push({ title, href, dateObj, dateStr });
      });

      // 날짜 기준 최신순 정렬 (내림차순)
      parsedItems.sort((a, b) => b.dateObj - a.dateObj);

      // 상위 10개만 추출
      const top10 = parsedItems.slice(0, 10);
      listElement.innerHTML = ''; // 로딩 텍스트 제거

      if (top10.length === 0) {
        listElement.innerHTML = '<li>게시글을 파싱하지 못했습니다. CSS 선택자를 확인하세요.</li>';
        return;
      }

      // 화면 렌더링
      top10.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.href;
        a.target = '_blank';
        a.innerHTML = `${item.title} ${isRecent(item.dateObj) ? '<span class="new-tag">NEW</span>' : ''}`;
        
        li.appendChild(a);
        listElement.appendChild(li);
      });
    })
    .catch(error => {
      console.error('Fetch error:', error);
      listElement.innerHTML = '<li style="color:red;">데이터를 불러오지 못했습니다.</li>';
    });
}

// 3일 이내 게시글인지 확인하는 함수
function isRecent(postDate) {
  if (postDate.getTime() === new Date(0).getTime()) return false; // 날짜 파싱 실패작
  
  const now = new Date();
  const diffTime = Math.abs(now - postDate);
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays <= 3; // 3일 이내면 true
}

// 공통 게시판 크롤링 함수 (Background 우회 적용)
function fetchBoardData(url, listId) {
  const listElement = document.getElementById(listId);

  // 직접 fetch하지 않고 background.js에 통신 위임
  chrome.runtime.sendMessage({ action: "fetchHTML", url: url }, (response) => {
    // 통신 실패 또는 CORS 에러 처리
    if (!response || !response.success) {
      console.error(`${url} Fetch error:`, response?.error);
      listElement.innerHTML = '<li style="color:red;">데이터를 불러오지 못했습니다. (통신 오류)</li>';
      return;
    }

    // background.js가 성공적으로 받아온 HTML 텍스트
    const html = response.data;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const rows = doc.querySelectorAll('table tr'); 
    const parsedItems = [];

    rows.forEach(row => {
      if (row.querySelector('th')) return;

      const linkElement = row.querySelector('a');
      if (!linkElement || linkElement.innerText.trim() === '') return;

      const title = linkElement.innerText.trim();
      const href = new URL(linkElement.getAttribute('href'), url).href;
      
      const rowText = row.innerText;
      const dateMatch = rowText.match(/(\d{2,4})[-./](\d{1,2})[-./](\d{1,2})/);
      
      let dateObj = new Date(0); 
      let dateStr = "";

      if (dateMatch) {
        let [_, y, m, d] = dateMatch;
        if (y.length === 2) y = '20' + y; 
        dateObj = new Date(y, m - 1, d);
        dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      parsedItems.push({ title, href, dateObj, dateStr });
    });

    parsedItems.sort((a, b) => b.dateObj - a.dateObj);
    const top10 = parsedItems.slice(0, 10);
    
    listElement.innerHTML = ''; 

    if (top10.length === 0) {
      listElement.innerHTML = '<li>게시글을 파싱하지 못했습니다. CSS 선택자를 확인하세요.</li>';
      return;
    }

    top10.forEach(item => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href;
      a.target = '_blank';
      a.innerHTML = `${item.title} ${isRecent(item.dateObj) ? '<span class="new-tag">NEW</span>' : ''}`;
      
      li.appendChild(a);
      listElement.appendChild(li);
    });
  });
}