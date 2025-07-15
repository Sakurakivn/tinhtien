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
                // Dữ liệu đã khá chuẩn, chỉ cần trả về
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
                return {
                    sbd: studentVietTimes.sbd,
                    toan: parseFloat(studentVietTimes.dm01),
                    van: parseFloat(studentVietTimes.dm02),
                    ngoaiNgu: parseFloat(studentVietTimes.dm07),
                    vatLy: parseFloat(studentVietTimes.dm03),
                    hoaHoc: parseFloat(studentVietTimes.dm04),
                    sinhHoc: parseFloat(studentVietTimes.dm05),
                    // Các môn khác có thể không có hoặc cần ánh xạ thêm
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
        // Tạo một danh sách API để thử, bắt đầu bằng API được người dùng ưu tiên
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
                // Nếu không thành công, sẽ tự động chuyển sang vòng lặp tiếp theo
                addLogMessage(`SBD ${sbd}: Nguồn ${source} không có dữ liệu.`, 'error');
            } catch (error) {
                console.error(`Lỗi với nguồn ${source} cho SBD ${sbd}:`, error);
                addLogMessage(`SBD ${sbd}: Nguồn ${source} bị lỗi.`, 'error');
            }
        }
        // Nếu tất cả các nguồn đều thất bại
        return { sbd: sbd, notFound: true };
    }

    async function startLookup(sbdList) {
        lookupButton.disabled = true;
        lookupButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        progressBar.value = 0;
        progressText.textContent = '';
        logContainer.innerHTML = '';
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

    // Các hàm displayResults, addLogMessage giữ nguyên như phiên bản trước
    function addLogMessage(message, type = 'info') { /* ... */ }
    function displayResults(results) { /* ... */ }
});
