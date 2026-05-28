document.addEventListener('DOMContentLoaded', () => {
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

    fetchBoardData('https://e3home.cau.ac.kr/em/em_1.php', 'eee-list');
    fetchBoardData('https://www.disu.ac.kr/community/notice', 'disu-all-list');
    fetchBoardData('https://www.disu.ac.kr/community/notice?cidx=44', 'disu-cau-list');
});

function fetchBoardData(url, listId) {
    const listElement = document.getElementById(listId);

    chrome.runtime.sendMessage({ action: "fetchHTML", url: url }, (response) => {
    if (!response || !response.success) {
        console.error(`${url} Fetch error:`, response?.error);
        listElement.innerHTML = '<li style="color:red;">데이터 통신에 실패했습니다.</li>';
        return;
    }

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
        
        let href = url; 
        const hrefAttr = linkElement.getAttribute('href');
        
        if (listId === 'eee-list') {
        href = url;
        } else if (hrefAttr) {
        const viewMatch = hrefAttr.match(/view\(['"]?(\d+)['"]?\)/);
        
        if (viewMatch) {
            const postId = viewMatch[1];
            const tempUrl = new URL(url);
            tempUrl.searchParams.set('mode', 'view');
            tempUrl.searchParams.set('idx', postId);
            href = tempUrl.href;
        } 
        else if (hrefAttr !== '#' && !hrefAttr.toLowerCase().includes('javascript:')) {
            try {
            href = new URL(hrefAttr, url).href;
            } catch (e) {
            href = url;
            }
        }
        }

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

function isRecent(postDate) {
    if (postDate.getTime() === new Date(0).getTime()) return false; 
    const now = new Date();
    const diffTime = Math.abs(now - postDate);
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 3; 
}