// File: /api/lookup-score.js

export default async function handler(req, res) {
    // Lấy số báo danh từ query parameter của URL
    const { sbd } = req.query;

    if (!sbd) {
        return res.status(400).json({ error: 'Vui lòng cung cấp số báo danh (sbd).' });
    }

    // API endpoint của bên thứ ba
    const API_ENDPOINT = `https://dantri.com.vn/thpt/1/0/99/${sbd}/2025/0.2/search-gradle.htm`;

    try {
        // Gọi đến API của dantri từ phía server
        const apiResponse = await fetch(API_ENDPOINT, {
            headers: {
                'Referer': 'https://dantri.com.vn/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!apiResponse.ok) {
            // Nếu API của dantri trả về lỗi, chúng ta chuyển tiếp lỗi đó
            return res.status(apiResponse.status).json({ error: `Lỗi từ API gốc: ${apiResponse.statusText}` });
        }

        const data = await apiResponse.json();
        
        // Trả về dữ liệu thành công cho trình duyệt
        res.status(200).json(data.student);

    } catch (error) {
        console.error('Lỗi API trung gian:', error);
        res.status(500).json({ error: 'Lỗi server nội bộ khi tra cứu điểm.' });
    }
}
