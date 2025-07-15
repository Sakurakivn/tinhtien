document.addEventListener('DOMContentLoaded', () => {
    // === KHAI BÁO BIẾN DOM ===
    const sbdTextarea = document.getElementById('sbd-textarea');
    const lookupButton = document.getElementById('lookup-button');
    const progressBar = document.getElementById('lookup-progress');
    const progressText = document.getElementById('progress-text');
    const resultsContainer = document.getElementById('results-table-container');
    const logContainer = document.getElementById('log-container');
    const apiSelect = document.getElementById('api-select');
    const yearSelect = document.getElementById('year-select');
    const exportButton = document.getElementById('export-results-btn');

    // Biến để lưu kết quả tra cứu gần nhất
    let currentResults = [];

    // === HÀM KHỞI TẠO ===
    /**
     * Tự động tạo danh sách các năm trong menu dropdown, bắt đầu từ năm hiện tại.
     */
    function populateYearSelect() {
        if (!yearSelect) return;
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= 2020; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `Năm ${year}`;
            yearSelect.appendChild(option);
        }
    }

    // === CÁC HÀM XỬ LÝ CHÍNH ===

    /**
     * Bắt đầu quá trình tra cứu khi nhấn nút.
     * @param {string[]} sbdList - Danh sách các SBD cần tra cứu.
     */
    async function startLookup(sbdList) {
        // Vô hiệu hóa các nút và reset giao diện
        lookupButton.disabled = true;
        exportButton.style.display = 'none';
        lookupButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        progressBar.value = 0;
        progressText.textContent = '';
        logContainer.innerHTML = '<p class="placeholder-text">Bắt đầu quá trình tra cứu...</p>';
        resultsContainer.innerHTML = '<p class="placeholder-text">Đang chuẩn bị kết quả...</p>';

        const preferredApi = apiSelect.value;
        const selectedYear = yearSelect.value;
        const processedResults = [];
        const totalSBDs = sbdList.length;

        // Lặp qua từng SBD để tra cứu
        for (let i = 0; i < totalSBDs; i++) {
            const sbd = sbdList[i].trim();
            const result = await fetchScoreWithFallback(sbd, preferredApi, selectedYear);
            processedResults.push(result);

            // Cập nhật thanh tiến trình
            const progressValue = ((i + 1) / totalSBDs) * 100;
            progressBar.value = progressValue;
            progressText.textContent = `Hoàn thành ${i + 1}/${totalSBDs}`;
        }
        
        currentResults = processedResults; // Lưu kết quả lại để dùng cho chức năng xuất file
        displayResults(processedResults);

        // Khôi phục lại các nút
        lookupButton.disabled = false;
        lookupButton.innerHTML = '<i class="fas fa-rocket"></i> Tra cứu';
        addLogMessage('Hoàn tất tra cứu!', 'success');
    }

    /**
     * Lấy điểm cho một SBD, có cơ chế tự động thử nguồn API khác nếu thất bại.
     * @param {string} sbd - Số báo danh.
     * @param {string} preferredApi - Nguồn API ưu tiên.
     * @param {string} year - Năm tra cứu.
     * @returns {object} Dữ liệu điểm đã được chuẩn hóa.
     */
    async function fetchScoreWithFallback(sbd, preferredApi, year) {
        const apiSources = ['dantri', 'tuoitre', 'viettimes'];
        const tryOrder = [preferredApi, ...apiSources.filter(api => api !== preferredApi)];

        for (const source of tryOrder) {
            try {
                addLogMessage(`SBD ${sbd}: Đang thử với nguồn ${source} cho năm ${year}...`);
                const response = await fetch(`/api/lookup-score?sbd=${sbd}&source=${source}&year=${year}`);
                if (response.ok) {
                    const result = await response.json();
                    const normalized = normalizeData(result.source, result.data);
                    if (normalized && normalized.sbd) {
                        addLogMessage(`SBD ${sbd}: Tra cứu thành công từ ${source}!`, 'success');
                        return normalized;
                    }
                }
                addLogMessage(`SBD ${sbd}: Nguồn ${source} không có dữ liệu. Đang chuyển...`, 'error');
            } catch (error) {
                console.error(`Lỗi với nguồn ${source} cho SBD ${sbd}:`, error);
                addLogMessage(`SBD ${sbd}: Nguồn ${source} bị lỗi. Đang chuyển...`, 'error');
            }
        }
        // Trả về đối tượng notFound nếu tất cả các nguồn đều thất bại
        return { sbd: sbd, notFound: true };
    }

    /**
     * Hiển thị kết quả lên bảng.
     * @param {Array} results - Mảng kết quả đã được xử lý.
     */
    function displayResults(results) {
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="placeholder-text">Không có SBD nào được xử lý.</p>';
            exportButton.style.display = 'none';
            return;
        }

        exportButton.style.display = 'inline-flex'; // Hiện nút xuất khi có kết quả

        const allPossibleSubjects = {
            "toan": "Toán", "van": "Văn", "ngoaiNgu": "Ngoại Ngữ",
            "vatLy": "Lý", "hoaHoc": "Hóa", "sinhHoc": "Sinh",
            "lichSu": "Sử", "diaLy": "Địa", "gdcd": "GDCD"
        };
        
        let tableHTML = '<table class="results-table">';
        
        // Tạo header cho bảng
        tableHTML += '<thead><tr><th>STT</th><th>SBD</th>';
        Object.values(allPossibleSubjects).forEach(name => tableHTML += `<th>${name}</th>`);
        tableHTML += '</tr></thead><tbody>';

        // Tạo các dòng dữ liệu
        results.forEach((student, index) => {
            const rowClass = student.notFound ? 'class="not-found-row"' : '';
            tableHTML += `<tr ${rowClass}><td>${index + 1}</td><td>${student.sbd}</td>`;
            Object.keys(allPossibleSubjects).forEach(subjectKey => {
                const cellValue = student.notFound ? 'Không tìm thấy' : (student[subjectKey] ?? '');
                tableHTML += `<td>${cellValue}</td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        resultsContainer.innerHTML = tableHTML;
    }

    /**
     * Xử lý việc xuất dữ liệu ra file CSV.
     * @param {Array} dataToExport - Dữ liệu cần xuất.
     */
    function handleExportToCSV(dataToExport) {
        if (!dataToExport || dataToExport.length === 0) {
            showNotification("Không có dữ liệu để xuất.", "error");
            return;
        }

        const allPossibleSubjects = {
            "toan": "Toán", "van": "Văn", "ngoaiNgu": "Ngoại Ngữ",
            "vatLy": "Lý", "hoaHoc": "Hóa", "sinhHoc": "Sinh",
            "lichSu": "Sử", "diaLy": "Địa", "gdcd": "GDCD"
        };

        const headers = ["SBD", ...Object.values(allPossibleSubjects)];
        
        const rows = dataToExport.map(student => {
            const row = [student.sbd];
            Object.keys(allPossibleSubjects).forEach(subjectKey => {
                const cellValue = student.notFound ? 'NOT_FOUND' : (student[subjectKey] ?? '');
                row.push(cellValue);
            });
            return row;
        });

        let csvContent = headers.join(",") + "\r\n";
        rows.forEach(rowArray => {
            csvContent += rowArray.join(",") + "\r\n";
        });

        const BOM = "\uFEFF"; // Giúp Excel đọc tiếng Việt tốt hơn
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `ket_qua_tra_cuu_diem_${yearSelect.value}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("Đã xuất file CSV thành công!", "success");
    }

    // === CÁC HÀM HỖ TRỢ ===
    function addLogMessage(message, type = 'info') {
        if (!logContainer) return;
        if (logContainer.querySelector('.placeholder-text')) {
            logContainer.innerHTML = '';
        }
        const logEntry = document.createElement('p');
        logEntry.className = `log-message ${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    function normalizeData(source, data) {
        if (!data) return null;
        const parseScore = (score) => (score !== null && score !== undefined && score >= 0) ? parseFloat(score) : null;
        switch (source) {
            case 'dantri':
                return data;
            case 'tuoitre':
                const sT = data.data?.[0];
                return sT ? { sbd: sT.SBD, toan: parseScore(sT.TOAN), van: parseScore(sT.VAN), ngoaiNgu: parseScore(sT.NGOAI_NGU), vatLy: parseScore(sT.LI), hoaHoc: parseScore(sT.HOA), sinhHoc: parseScore(sT.SINH), lichSu: parseScore(sT.SU), diaLy: parseScore(sT.DIA), gdcd: parseScore(sT.GIAO_DUC_CONG_DAN) } : null;
            case 'viettimes':
                const sVT = data.data?.results?.[0];
                return sVT ? { sbd: sVT.sbd, toan: parseScore(sVT.dm01), van: parseScore(sVT.dm02), ngoaiNgu: parseScore(sVT.dm07), vatLy: parseScore(sVT.dm03), hoaHoc: parseScore(sVT.dm04), sinhHoc: parseScore(sVT.dm05), lichSu: parseScore(sVT.dm06), diaLy: parseScore(sVT.dm08), gdcd: parseScore(sVT.dm09) } : null;
            default:
                return null;
        }
    }

    // === GÁN SỰ KIỆN ===
    lookupButton.addEventListener('click', () => {
        const sbdList = sbdTextarea.value.trim().split('\n').filter(sbd => sbd.trim() !== '');
        if (sbdList.length === 0) {
            showNotification("Vui lòng nhập ít nhất một số báo danh.", "error");
            return;
        }
        startLookup(sbdList);
    });

    exportButton.addEventListener('click', () => {
        handleExportToCSV(currentResults);
    });

    // === KHỞI TẠO BAN ĐẦU ===
    populateYearSelect();
});
