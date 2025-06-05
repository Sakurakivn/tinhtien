    const ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD; 

    export default async function handler(req, res) {
        if (req.method !== 'POST') {
            res.setHeader('Allow', ['POST']);
            return res.status(405).end('Method Not Allowed');
        }

        if (!ADMIN_PASSWORD) {
            console.error("[API Login] Lỗi nghiêm trọng: Biến môi trường APP_ADMIN_PASSWORD chưa được thiết lập trên server.");
            return res.status(500).json({ success: false, message: 'Lỗi cấu hình máy chủ.' });
        }

        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Mật khẩu là bắt buộc.' });
        }

        if (password === ADMIN_PASSWORD) {
            // Không cần trả về token phức tạp cho trường hợp này, 
            // chỉ cần xác nhận thành công để client tự đặt sessionStorage.
            console.log("[API Login] Đăng nhập thành công.");
            return res.status(200).json({ success: true, message: 'Đăng nhập thành công!' });
        } else {
            console.log("[API Login] Đăng nhập thất bại: Mật khẩu không đúng.");
            return res.status(401).json({ success: false, message: 'Mật khẩu không đúng.' });
        }
    }
    
