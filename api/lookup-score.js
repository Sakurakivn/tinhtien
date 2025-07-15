// File: /api/lookup-score.js - Phiên bản nâng cấp

export default async function handler(req, res) {
    const { sbd, source = 'dantri' } = req.query; // Mặc định là 'dantri'

    if (!sbd) {
        return res.status(400).json({ error: 'Vui lòng cung cấp số báo danh (sbd).' });
    }

    const year = new Date().getFullYear(); // Tự động lấy năm hiện tại

    // Danh sách các API endpoints
    const apiEndpoints = {
        dantri: `https://dantri.com.vn/thpt/1/0/99/${sbd}/${year}/0.2/search-gradle.htm`,
        tuoitre: `https://s6.tuoitre.vn/api/diem-thi-thpt.htm?sbd=${sbd}&year=${year}`,
        viettimes: `https://api.viettimes.vn/api/diem-thi?type=0&keyword=${sbd}&kythi=THPT&nam=${year}`
    };

    const targetUrl = apiEndpoints[source];

    if (!targetUrl) {
        return res.status(400).json({ error: 'Nguồn API không hợp lệ.' });
    }

    try {
        const apiResponse = await fetch(targetUrl, {
            headers: {
                'Referer': new URL(targetUrl).origin + '/', // Tự động lấy referer
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!apiResponse.ok) {
            throw new Error(`API gốc trả về lỗi: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        
        // Trả về dữ liệu gốc và nguồn để phía client xử lý
        res.status(200).json({ source, data });

    } catch (error) {
        console.error(`Lỗi khi gọi API [${source}] cho SBD ${sbd}:`, error);
        res.status(500).json({ error: error.message });
    }
}
