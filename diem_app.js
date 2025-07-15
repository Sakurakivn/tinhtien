document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const sbdTextarea = document.getElementById('sbd-textarea');
    const lookupButton = document.getElementById('lookup-button');
    const progressBar = document.getElementById('lookup-progress');
    const progressText = document.getElementById('progress-text');
    const resultsContainer = document.getElementById('results-table-container');
    const logContainer = document.getElementById('log-container');
    const apiSelect = document.getElementById('api-select');
    const exportButton = document.getElementById('export-results-btn'); // Nút mới

    // Biến để lưu kết quả tra cứu
    let currentResults = [];

    // === EVENT LISTENERS ===
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

    // === CÁC HÀM XỬ LÝ ===
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
                const studentTuoitre = data.data?.[0];
                if (!studentTuoitre) return null;
                return {
                    sbd: studentTuoitre.SBD, toan: parseScore(studentTuoitre.TOAN), van: parseScore(studentTuoitre.VAN),
                    ngoaiNgu: parseScore(studentTuoitre.NGOAI_NGU), vatLy: parseScore(studentTuoitre.LI),
                    hoaHoc: parseScore(studentTuoitre.HOA), sinhHoc: parseScore(studentTuoitre.SINH),
                    lichSu: parseScore(studentTuoitre.SU), diaLy: parseScore(studentTuoitre.DIA),
                    gdcd: parseScore(studentTuoitre.GIAO_DUC_CONG_DAN)
                };
            case 'viettimes':
                const studentVietTimes = data.data?.results?.[0];
                if (!studentVietTimes) return null;
                return {
                    sbd: studentVietTimes.sbd, toan: parseScore(studentVietTimes.dm01), van: parseScore(studentVietTimes.dm02),
                    ngoaiNgu: parseScore(studentVietTimes.dm07), vatLy: parseScore(studentVietTimes.dm03),
                    hoaHoc: parseScore(studentVietTimes.dm04), sinhHoc: parseScore(studentVietTimes.dm05),
                    lichSu: parseScore(studentVietTimes.dm06), diaLy: parseScore(studentVietTimes.dm08),
                    gdcd: parseScore(studentVietTimes.dm09)
                };
            default:
                return null;
        }
    }
    
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
                        addLogMessage(`SBD ${sbd}: Tra cứu thành công từ ${source}!`, 'success');
                        return normalized;
                    }
                }
                addLogMessage(`SBD ${sbd}: Nguồn ${source} không có dữ liệu. Đang chuyển nguồn...`, 'error');
            } catch (error) {
                console.error(`Lỗi với nguồn ${source} cho SBD ${sbd}:`, error);
                addLogMessage(`SBD ${sbd}: Nguồn ${source} bị lỗi. Đang chuyển nguồn...`, 'error');
            }
        }
        return { sbd: sbd, notFound: true };
    }

    async function startLookup(sbdList) {
        lookupButton.disabled = true;
        exportButton.style.display = 'none'; // Ẩn nút xuất khi bắt đầu
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
        
        currentResults = processedResults; // Lưu kết quả để xuất file
        displayResults(processedResults);
        lookupButton.disabled = false;
        lookupButton.innerHTML = '<i class="fas fa-rocket"></i> Tra cứu';
        addLogMessage('Hoàn tất tra cứu!', 'success');
    }

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
        tableHTML += '<thead><tr><th>STT</th><th>SBD</th>';
        Object.values(allPossibleSubjects).forEach(name => tableHTML += `<th>${name}</th>`);
        tableHTML += '</tr></thead><tbody>';

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

    // --- HÀM XUẤT CSV MỚI ---
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

        const BOM = "\uFEFF"; // Để Excel đọc tiếng Việt tốt hơn
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "ket_qua_tra_cuu_diem.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("Đã xuất file CSV thành công!", "success");
    }
});
