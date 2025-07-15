document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const sbdTextarea = document.getElementById('sbd-textarea');
    const lookupButton = document.getElementById('lookup-button');
    const progressBar = document.getElementById('lookup-progress');
    const progressText = document.getElementById('progress-text');
    const resultsContainer = document.getElementById('results-table-container');
    const logContainer = document.getElementById('log-container');
    const apiSelect = document.getElementById('api-select');

    // === EVENT LISTENERS ===
    lookupButton.addEventListener('click', () => {
        const sbdList = sbdTextarea.value.trim().split('\n').filter(sbd => sbd.trim() !== '');
        if (sbdList.length === 0) {
            showNotification("Vui lòng nhập ít nhất một số báo danh.", "error");
            return;
        }
        startLookup(sbdList);
    });

    // === CÁC HÀM XỬ LÝ ===

    /**
     * "Chuẩn hóa" dữ liệu từ các API khác nhau về một định dạng chung.
     */
    function normalizeData(source, data) {
        if (!data) return null;

        switch (source) {
            case 'dantri':
                return data;
            
            case 'tuoitre':
                const studentTuoitre = data.data?.[0];
                if (!studentTuoitre) return null;
                return {
                    sbd: studentTuoitre.SBD,
                    toan: studentTuoitre.TOAN,
                    van: studentTuoitre.VAN,
                    ngoaiNgu: studentTuoitre.NGOAI_NGU,
                    vatLy: studentTuoitre.LI,
                    hoaHoc: studentTuoitre.HOA,
                    sinhHoc: studentTuoitre.SINH,
                    lichSu: studentTuoitre.SU,
                    diaLy: studentTuoitre.DIA,
                    gdcd: studentTuoitre.GIAO_DUC_CONG_DAN
                };

            case 'viettimes':
                const studentVietTimes = data.data?.results?.[0];
                if (!studentVietTimes) return null;
                // Chuyển đổi điểm từ chuỗi sang số, xử lý trường hợp -1
                const parseScore = (scoreStr) => {
                    const score = parseFloat(scoreStr);
                    return score < 0 ? null : score;
                };
                return {
                    sbd: studentVietTimes.sbd,
                    toan: parseScore(studentVietTimes.dm01),
                    van: parseScore(studentVietTimes.dm02),
                    ngoaiNgu: parseScore(studentVietTimes.dm07),
                    vatLy: parseScore(studentVietTimes.dm03),
                    hoaHoc: parseScore(studentVietTimes.dm04),
                    sinhHoc: parseScore(studentVietTimes.dm05),
                    lichSu: parseScore(studentVietTimes.dm06),
                    diaLy: parseScore(studentVietTimes.dm08),
                    gdcd: parseScore(studentVietTimes.dm09)
                };

            default:
                return null;
        }
    }
    
    /**
     * Tra cứu điểm cho một SBD, có cơ chế thử lại với API khác nếu thất bại.
     */
    async function fetchScoreWithFallback(sbd, preferredApi) {
        const apiSources = ['dantri', 'tuoitre', 'viettimes'];
        const tryOrder = [preferredApi, ...apiSources.filter(api => api !== preferredApi)];

        for (const source of tryOrder) {
            try {
                addLogMessage(`SBD ${sbd}: Đang thử với nguồn ${source}...`);
                const response = await fetch(`/api/lookup-score?sbd=${sbd}&source=${source}`);
                if (response.ok) {
                    const result = await response.json();
                    const normalized = normalizeData(result.source, result.data);
                    if (normalized && normalized.sbd) {
                        addLogMessage(`SBD ${sbd}: Tra cứu thành công từ nguồn ${source}!`, 'success');
                        return normalized;
                    }
                }
                addLogMessage(`SBD ${sbd}: Nguồn ${source} không có dữ liệu.`, 'error');
            } catch (error) {
                console.error(`Lỗi với nguồn ${source} cho SBD ${sbd}:`, error);
                addLogMessage(`SBD ${sbd}: Nguồn ${source} bị lỗi.`, 'error');
            }
        }
        return { sbd: sbd, notFound: true };
    }

    async function startLookup(sbdList) {
        lookupButton.disabled = true;
        lookupButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        progressBar.value = 0;
        progressText.textContent = '';
        logContainer.innerHTML = '<p class="placeholder-text">Bắt đầu quá trình tra cứu...</p>';
        resultsContainer.innerHTML = '<p class="placeholder-text">Đang chuẩn bị kết quả...</p>';

        const preferredApi = apiSelect.value;
        const processedResults = [];
        const totalSBDs = sbdList.length;

        for (let i = 0; i < totalSBDs; i++) {
            const sbd = sbdList[i].trim();
            const result = await fetchScoreWithFallback(sbd, preferredApi);
            processedResults.push(result);

            const progressValue = ((i + 1) / totalSBDs) * 100;
            progressBar.value = progressValue;
            progressText.textContent = `Hoàn thành ${i + 1}/${totalSBDs}`;
        }
        
        displayResults(processedResults);
        lookupButton.disabled = false;
        lookupButton.innerHTML = '<i class="fas fa-rocket"></i> Tra cứu';
        addLogMessage('Hoàn tất tra cứu!', 'success');
    }

    // ▼▼▼ SỬA LỖI: CUNG CẤP LẠI ĐẦY ĐỦ NỘI DUNG CHO CÁC HÀM NÀY ▼▼▼

    /**
     * Thêm một dòng log vào khung nhật ký và tự động cuộn xuống.
     * @param {string} message - Nội dung log.
     * @param {'success'|'error'|'info'} type - Loại log.
     */
    function addLogMessage(message, type = 'info') {
        if (!logContainer) return;
        if (logContainer.querySelector('.placeholder-text')) {
            logContainer.innerHTML = ''; // Xóa placeholder khi có log đầu tiên
        }
        const logEntry = document.createElement('p');
        logEntry.className = `log-message ${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    /**
     * Hiển thị kết quả lên bảng, bao gồm cả các SBD không tìm thấy.
     * @param {Array} results - Mảng kết quả đã được xử lý.
     */
    function displayResults(results) {
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="placeholder-text">Không có SBD nào được xử lý.</p>';
            return;
        }

        const allPossibleSubjects = {
            "toan": "Toán", "van": "Văn", "ngoaiNgu": "Ngoại Ngữ",
            "vatLy": "Lý", "hoaHoc": "Hóa", "sinhHoc": "Sinh",
            "lichSu": "Sử", "diaLy": "Địa", "gdcd": "GDCD"
        };
        
        let tableHTML = '<table class="results-table">';
        
        tableHTML += '<thead><tr><th>STT</th><th>SBD</th>';
        for (const subjectName of Object.values(allPossibleSubjects)) {
            tableHTML += `<th>${subjectName}</th>`;
        }
        tableHTML += '</tr></thead>';

        tableHTML += '<tbody>';
        results.forEach((student, index) => {
            const rowClass = student.notFound ? 'class="not-found-row"' : '';
            tableHTML += `<tr ${rowClass}>`;
            tableHTML += `<td>${index + 1}</td>`;
            tableHTML += `<td>${student.sbd}</td>`;
            
            for (const subjectKey of Object.keys(allPossibleSubjects)) {
                if (student.notFound) {
                    tableHTML += `<td>Không tìm thấy</td>`;
                } else {
                    const score = student[subjectKey];
                    // Hiển thị 'N/A' nếu điểm là null hoặc undefined
                    tableHTML += `<td>${score !== null && score !== undefined ? score : 'N/A'}</td>`;
                }
            }
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';

        resultsContainer.innerHTML = tableHTML;
    }
});
