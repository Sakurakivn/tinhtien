// File: api/customers/[id]/orders.js
import { MongoClient, ObjectId } from 'mongodb';

let cachedDb = null;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'photoAppDB';

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }
    if (!MONGODB_URI) {
        throw new Error('Vui lòng định nghĩa biến môi trường MONGODB_URI');
    }
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    cachedDb = db;
    return db;
}

// Hàm phụ trợ để parse chuỗi ngày tháng từ client (ví dụ: "dd/mm/yyyy, HH:MM:SS")
// thành đối tượng Date mà MongoDB có thể hiểu đúng múi giờ (nên dùng ISO 8601 hoặc UTC)
// Hoặc đơn giản là new Date() nếu client gửi đúng định dạng Date có thể parse.
// Client đang gửi: new Date().toLocaleString('vi-VN', {...})
// ví dụ: "30/05/2025, 10:30:00"
function parseClientDateTimeToUTCDate(clientDateTimeString) {
    if (!clientDateTimeString) return new Date(); // Mặc định là thời gian hiện tại nếu không có
    
    const parts = clientDateTimeString.split(', '); // Tách ngày và giờ
    const dateParts = parts[0].split('/'); // [dd, mm, yyyy]
    const timeParts = parts[1] ? parts[1].split(':') : ['00', '00', '00']; // [HH, MM, SS]

    // Tạo đối tượng Date. Lưu ý tháng trong JavaScript là 0-indexed (0-11)
    // new Date(year, monthIndex, day, hours, minutes, seconds)
    const year = parseInt(dateParts[2]);
    const month = parseInt(dateParts[1]) - 1; 
    const day = parseInt(dateParts[0]);
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = parseInt(timeParts[2] || '0');

    // Tạo ngày giờ theo local của server, sau đó có thể chuyển sang UTC nếu cần.
    // Hoặc tốt nhất là client nên gửi timestamp UTC.
    // Vì toLocaleString('vi-VN') là local time của client, khi server parse, nó sẽ là local time của server.
    // Để đơn giản, chúng ta cứ lưu nó như một đối tượng Date. MongoDB sẽ lưu trữ nó dưới dạng UTC.
    return new Date(year, month, day, hours, minutes, seconds);
}


export default async function handler(req, res) {
    const { id: customerId } = req.query; // customerId lấy từ path segment '[id]'

    if (!ObjectId.isValid(customerId)) {
        return res.status(400).json({ message: 'ID khách hàng không hợp lệ' });
    }

    try {
        const db = await connectToDatabase();
        const customersCollection = db.collection('customers');

        if (req.method === 'POST') {
            const orderDataFromClient = req.body; 
            if (!orderDataFromClient || Object.keys(orderDataFromClient).length === 0) {
                return res.status(400).json({ message: 'Dữ liệu đơn hàng không được để trống' });
            }

            // Tạo một đối tượng order mới để đảm bảo cấu trúc và thêm các trường cần thiết
            const newOrder = {
                ...orderDataFromClient, // Giữ lại các trường từ client như fileName, pages, finalTotalPrice, etc.
                orderId: new ObjectId(), // Tạo ID duy nhất cho đơn hàng này
                // Chuyển đổi chuỗi 'createdAt' từ client (ví dụ: "30/05/2025, 10:00:00") thành đối tượng Date của MongoDB
                createdAt: parseClientDateTimeToUTCDate(orderDataFromClient.createdAt), 
                // Các trường khác như 'totalPriceBeforeDiscount', 'friendDiscountApplied' đã có trong orderDataFromClient
            };
            // Không cần createdAtDate riêng nữa vì createdAt đã là Date object

            const result = await customersCollection.updateOne(
                { _id: new ObjectId(customerId) },
                {
                    $push: { orders: newOrder },      // Thêm đơn hàng mới vào mảng 'orders'
                    $inc: { purchaseCount: 1 },       // Tăng số lần mua lên 1
                    $set: { updatedAt: new Date() }   // Cập nhật ngày cập nhật khách hàng
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Không tìm thấy khách hàng để thêm đơn hàng' });
            }
            if (result.modifiedCount === 0 && result.upsertedCount === 0) {
                // Trường hợp này ít xảy ra nếu matchedCount > 0 và $push/$inc được dùng
                return res.status(500).json({ message: 'Không thể cập nhật đơn hàng cho khách hàng (modifiedCount is 0)' });
            }

            // Trả về khách hàng đã được cập nhật (bao gồm cả đơn hàng mới và purchaseCount mới)
            const updatedCustomer = await customersCollection.findOne({ _id: new ObjectId(customerId) });
            res.status(201).json({ message: 'Đã thêm đơn hàng thành công!', customer: updatedCustomer });

        } else {
            res.setHeader('Allow', ['POST']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        console.error(`Lỗi API cho /api/customers/${customerId}/orders:`, error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi xử lý đơn hàng', error: error.message });
    }
}
