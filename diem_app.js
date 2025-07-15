document.addEventListener('DOMContentLoaded', () => {
    const sbdTextarea = document.getElementById('sbd-textarea');
    const lookupButton = document.getElementById('lookup-button');
    const progressBar = document.getElementById('lookup-progress');
    const progressText = document.getElementById('progress-text');
    const resultsContainer = document.getElementById('results-table-container');
    const logContainer = document.getElementById('log-container');

    lookupButton.addEventListener('click', () => {
        const sbdList = sbdTextarea.value.trim().split('\n').filter(sbd => sbd.trim() !== '');
        if (sbdList.length === 0) {
            showNotification("Vui lòng nhập ít nhất một số báo danh.", "error");
            return;
        }
        startLookup(sbdList);
    });

    /**
     * Thêm một dòng log vào khung nhật ký và tự động cuộn xuống.
     * @param {string} message - Nội dung log.
     * @param {'success'|'error'} type - Loại log.
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
        // Tự động cuộn xuống dưới cùng
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    async function startLookup(sbdList) {
        // Vô hiệu hóa nút bấm và reset giao diện
        lookupButton.disabled = true;
        lookupButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        progressBar.value = 0;
        progressText.textContent = '';
        resultsContainer.innerHTML = '<p class="placeholder-text">Đang chuẩn bị kết quả...</p>';
        logContainer.innerHTML = '<p class="placeholder-text">Nhật ký sẽ xuất hiện ở đây...</p>';

        const processedResults = [];
        const totalSBDs = sbdList.length;

        for (let i = 0; i < totalSBDs; i++) {
            const sbd = sbdList[i].trim();
            try {
                const response = await fetch(`/api/lookup-score?sbd=${sbd}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.sbd) {
                        processedResults.push(data);
                        addLogMessage(`SBD ${sbd}: Tra cứu thành công.`, 'success');
                    } else {
                        throw new Error('Không có dữ liệu điểm.');
                    }
                } else {
                     throw new Error(`Không tìm thấy (Lỗi ${response.status}).`);
                }
            } catch (error) {
                console.error(`Lỗi khi tra cứu SBD ${sbd}:`, error);
                processedResults.push({ sbd: sbd, notFound: true });
                addLogMessage(`SBD ${sbd}: ${error.message}`, 'error');
            }
            // Cập nhật thanh tiến trình
            const progressValue = ((i + 1) / totalSBDs) * 100;
            progressBar.value = progressValue;
            progressText.textContent = `Hoàn thành ${i + 1}/${totalSBDs}`;
        }

        displayResults(processedResults);

        // Khôi phục lại nút bấm
        lookupButton.disabled = false;
        lookupButton.innerHTML = '<i class="fas fa-rocket"></i> Tra cứu';
        addLogMessage('Hoàn tất tra cứu!', 'success');
    }

    function displayResults(results) {
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="placeholder-text">Không có SBD nào được xử lý.</p>';
            return;
        }

        // Xác định tất cả các cột môn thi có thể có
        const allPossibleSubjects = {
            "toan": "Toán", "van": "Văn", "ngoaiNgu": "Ngoại Ngữ",
            "vatLy": "Lý", "hoaHoc": "Hóa", "sinhHoc": "Sinh",
            "lichSu": "Sử", "diaLy": "Địa", "gdcd": "GDCD"
        };
        
        let tableHTML = '<table class="results-table">';
        
        // Tạo header
        tableHTML += '<thead><tr><th>STT</th><th>SBD</th>';
        for (const subjectName of Object.values(allPossibleSubjects)) {
            tableHTML += `<th>${subjectName}</th>`;
        }
        tableHTML += '</tr></thead>';

        // Tạo các dòng dữ liệu
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
                    tableHTML += `<td>${score !== null && score !== undefined ? score : 'N/A'}</td>`;
                }
            }
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';

        resultsContainer.innerHTML = tableHTML;
    }
});
