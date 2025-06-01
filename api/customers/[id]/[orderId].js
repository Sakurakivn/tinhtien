// File: api/customers/[id]/[orderId].js
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

export default async function handler(req, res) {
    const { id: customerIdParam, orderId: orderIdParam } = req.query;

    // 1. Kiểm tra tính hợp lệ của customerId và orderId
    if (!ObjectId.isValid(customerIdParam)) {
        return res.status(400).json({ message: `Customer ID không hợp lệ: ${customerIdParam}` });
    }
    if (!ObjectId.isValid(orderIdParam)) {
        return res.status(400).json({ message: `Order ID không hợp lệ: ${orderIdParam}` });
    }

    const customerObjectId = new ObjectId(customerIdParam);
    const orderObjectId = new ObjectId(orderIdParam);

    if (req.method === 'DELETE') {
        try {
            const db = await connectToDatabase();
            const customersCollection = db.collection('customers');

            // 2. Kiểm tra xem khách hàng có tồn tại không
            const customerExists = await customersCollection.findOne({ _id: customerObjectId });
            if (!customerExists) {
                return res.status(404).json({ message: `Không tìm thấy khách hàng với ID: ${customerIdParam}` });
            }

            // 3. Thực hiện thao tác xóa đơn hàng và giảm purchaseCount
            const result = await customersCollection.updateOne(
                { 
                    _id: customerObjectId,
                    "orders.orderId": orderObjectId // Đảm bảo chỉ update nếu đơn hàng với orderId này tồn tại trong mảng
                },
                {
                    $pull: { orders: { orderId: orderObjectId } },
                    $inc: { purchaseCount: -1 },
                    $set: { updatedAt: new Date() }
                }
            );

            // 4. Kiểm tra kết quả của thao tác updateOne
            if (result.matchedCount === 0) {
                // Điều này không nên xảy ra nếu customerExists ở trên là true,
                // trừ khi có race condition hoặc customerId đúng nhưng orderId không có trong orders.
                // Tuy nhiên, điều kiện trong bộ lọc của updateOne ("orders.orderId": orderObjectId) đã kiểm tra sự tồn tại của order.
                // Nếu matchedCount = 0 ở đây, nghĩa là không tìm thấy khách hàng VÀ đơn hàng với ID tương ứng.
                return res.status(404).json({ message: `Không tìm thấy khách hàng hoặc đơn hàng với ID cung cấp để xóa. Customer ID: ${customerIdParam}, Order ID: ${orderIdParam}` });
            }

            if (result.modifiedCount === 0) {
                // Nếu matchedCount > 0 nhưng modifiedCount = 0, có nghĩa là bộ lọc tìm thấy khách hàng
                // nhưng không tìm thấy đơn hàng với orderId cụ thể đó trong mảng orders của họ (hoặc $pull không thành công vì lý do khác).
                console.warn(`Xóa đơn hàng: Customer ID ${customerIdParam}, Order ID ${orderIdParam}. Khách hàng được tìm thấy nhưng không có đơn hàng nào được xóa (modifiedCount=0). Có thể đơn hàng đã bị xóa trước đó.`);
                return res.status(404).json({ message: `Đơn hàng với ID ${orderIdParam} không tồn tại trong danh sách của khách hàng hoặc đã được xóa trước đó.` });
            }
            
            // 5. Đảm bảo purchaseCount không bị âm
            await customersCollection.updateOne(
                { _id: customerObjectId, purchaseCount: { $lt: 0 } },
                { $set: { purchaseCount: 0 } }
            );

            const updatedCustomer = await customersCollection.findOne({ _id: customerObjectId });
            res.status(200).json({ message: 'Đã xóa đơn hàng thành công', customer: updatedCustomer });

        } catch (error) {
            console.error(`Lỗi API xóa đơn hàng ${orderIdParam} cho KH ${customerIdParam}:`, error);
            res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi xóa đơn hàng', error: error.message });
        }
    } else {
        res.setHeader('Allow', ['DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
