document.addEventListener('DOMContentLoaded', () => {
    const sbdTextarea = document.getElementById('sbd-textarea');
    const lookupButton = document.getElementById('lookup-button');
    const progressBar = document.getElementById('lookup-progress');
    const progressText = document.getElementById('progress-text');
    const resultsContainer = document.getElementById('results-table-container');

    lookupButton.addEventListener('click', () => {
        const sbdList = sbdTextarea.value.trim().split('\n').filter(sbd => sbd.trim() !== '');
        if (sbdList.length === 0) {
            showNotification("Vui lòng nhập ít nhất một số báo danh.", "error");
            return;
        }
        startLookup(sbdList);
    });

    async function startLookup(sbdList) {
        // Vô hiệu hóa nút bấm và reset giao diện
        lookupButton.disabled = true;
        lookupButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        progressBar.value = 0;
        progressText.textContent = '';
        resultsContainer.innerHTML = '<p class="placeholder-text">Đang lấy dữ liệu...</p>';

        const results = [];
        const totalSBDs = sbdList.length;

        for (let i = 0; i < totalSBDs; i++) {
            const sbd = sbdList[i].trim();
            try {
                // Gọi API trung gian của chúng ta
                const response = await fetch(`/api/lookup-score?sbd=${sbd}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.sbd) {
                        results.push(data);
                    }
                }
            } catch (error) {
                console.error(`Lỗi khi tra cứu SBD ${sbd}:`, error);
            }
            // Cập nhật thanh tiến trình
            const progressValue = ((i + 1) / totalSBDs) * 100;
            progressBar.value = progressValue;
            progressText.textContent = `Hoàn thành ${i + 1}/${totalSBDs}`;
        }

        displayResults(results);

        // Khôi phục lại nút bấm
        lookupButton.disabled = false;
        lookupButton.innerHTML = '<i class="fas fa-rocket"></i> Tra cứu';
    }

    function displayResults(results) {
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="placeholder-text">Không tìm thấy kết quả nào hợp lệ.</p>';
            return;
        }

        // Xác định các môn thi có trong kết quả (cột động)
        const possibleSubjects = {
            "toan": "Toán", "van": "Văn", "ngoaiNgu": "Ngoại Ngữ",
            "vatLy": "Lý", "hoaHoc": "Hóa", "sinhHoc": "Sinh",
            "lichSu": "Sử", "diaLy": "Địa", "gdcd": "GDCD"
        };
        const fixedColumns = ["SBD"];
        const dynamicColumns = [];
        
        for (const key in possibleSubjects) {
            if (results.some(res => res[key] !== undefined && res[key] !== null)) {
                dynamicColumns.push(key);
            }
        }

        // Tạo bảng HTML
        let tableHTML = '<table class="results-table">';
        
        // Tạo header
        tableHTML += '<thead><tr><th>STT</th>';
        fixedColumns.forEach(col => tableHTML += `<th>${col}</th>`);
        dynamicColumns.forEach(key => tableHTML += `<th>${possibleSubjects[key]}</th>`);
        tableHTML += '</tr></thead>';

        // Tạo các dòng dữ liệu
        tableHTML += '<tbody>';
        results.forEach((student, index) => {
            tableHTML += '<tr>';
            tableHTML += `<td>${index + 1}</td>`;
            fixedColumns.forEach(colKey => tableHTML += `<td>${student[colKey.toLowerCase()] || ''}</td>`);
            dynamicColumns.forEach(key => {
                const score = student[key];
                tableHTML += `<td>${score !== null && score !== undefined ? score : ''}</td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';

        resultsContainer.innerHTML = tableHTML;
    }
});
