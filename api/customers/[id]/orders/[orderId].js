// File: api/customers/[id]/orders/[orderId].js
import { MongoClient, ObjectId } from 'mongodb';

let cachedDb = null;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'photoAppDB'; // Đảm bảo tên DB này đúng với cấu hình của bạn

async function connectToDatabase() {
    if (cachedDb) {
        console.log('[API Delete Order] Using cached database instance');
        return cachedDb;
    }
    if (!MONGODB_URI) {
        console.error('[API Delete Order] MONGODB_URI is not defined');
        // Trong môi trường serverless, việc throw error sẽ khiến function bị crash và trả về 500
        // Việc này thường được Vercel xử lý và log lại.
        throw new Error('Vui lòng định nghĩa biến môi trường MONGODB_URI');
    }
    console.log('[API Delete Order] Connecting to new database instance...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    cachedDb = db;
    console.log('[API Delete Order] Database connection established.');
    return db;
}

export default async function handler(req, res) {
    // Lấy customerId từ phần '[id]' và orderId từ phần '[orderId]' của đường dẫn
    // Ví dụ: /api/customers/abc/orders/xyz -> req.query.id = 'abc', req.query.orderId = 'xyz'
    // Tuy nhiên, vì tên tệp là [orderId].js nằm trong thư mục [id],
    // Vercel sẽ đặt tên tham số query theo tên thư mục/tệp đó.
    const customerIdParam = req.query.id; 
    const orderIdParam = req.query.orderId;

    console.log(`[API Delete Order] Received request: Method=${req.method}, CustomerID Param=${customerIdParam}, OrderID Param=${orderIdParam}`);

    if (req.method !== 'DELETE') {
        console.log(`[API Delete Order] Method Not Allowed: ${req.method}`);
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    if (!customerIdParam || !ObjectId.isValid(customerIdParam)) {
        console.error(`[API Delete Order] Invalid Customer ID Param: ${customerIdParam}`);
        return res.status(400).json({ message: `Customer ID không hợp lệ hoặc bị thiếu: ${customerIdParam}` });
    }
    if (!orderIdParam || !ObjectId.isValid(orderIdParam)) {
        console.error(`[API Delete Order] Invalid Order ID Param: ${orderIdParam}`);
        return res.status(400).json({ message: `Order ID không hợp lệ hoặc bị thiếu: ${orderIdParam}` });
    }

    const customerObjectId = new ObjectId(customerIdParam);
    const orderObjectId = new ObjectId(orderIdParam);

    try {
        const db = await connectToDatabase();
        const customersCollection = db.collection('customers');

        console.log(`[API Delete Order] Attempting to find customer with _id: ${customerObjectId}`);
        const customerBeforeUpdate = await customersCollection.findOne({ _id: customerObjectId });
        
        if (!customerBeforeUpdate) {
            console.log(`[API Delete Order] Customer not found with _id: ${customerObjectId}`);
            return res.status(404).json({ message: `Không tìm thấy khách hàng với ID: ${customerIdParam}` });
        }
        console.log(`[API Delete Order] Customer found. Name: ${customerBeforeUpdate.name}. Current purchaseCount: ${customerBeforeUpdate.purchaseCount}`);
        console.log(`[API Delete Order] Current orders count: ${customerBeforeUpdate.orders ? customerBeforeUpdate.orders.length : 0}`);

        // Kiểm tra xem đơn hàng có thực sự tồn tại trong mảng orders của khách hàng không
        const orderExists = customerBeforeUpdate.orders && customerBeforeUpdate.orders.some(order => order.orderId && order.orderId.equals(orderObjectId));

        if (!orderExists) {
            console.log(`[API Delete Order] Order with orderId: ${orderObjectId} not found in customer's orders array.`);
            return res.status(404).json({ message: `Đơn hàng với ID ${orderIdParam} không tồn tại trong danh sách của khách hàng hoặc đã được xóa.` });
        }
        
        console.log(`[API Delete Order] Order ${orderObjectId} found. Attempting to pull order and decrement purchaseCount.`);
        const result = await customersCollection.updateOne(
            { _id: customerObjectId }, // Điều kiện tìm khách hàng
            {
                $pull: { orders: { orderId: orderObjectId } }, // Xóa đơn hàng có orderId khớp
                $inc: { purchaseCount: -1 },                  // Giảm purchaseCount đi 1
                $set: { updatedAt: new Date() }               // Cập nhật thời gian
            }
        );

        console.log(`[API Delete Order] MongoDB updateOne result: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`);

        if (result.matchedCount === 0) {
            // Điều này không nên xảy ra nếu customerBeforeUpdate đã tìm thấy khách hàng
            console.error("[API Delete Order] MatchedCount is 0 after customer was found. This indicates an unexpected issue.");
            return res.status(404).json({ message: `Không tìm thấy khách hàng (lỗi logic không mong muốn).` });
        }

        if (result.modifiedCount === 0) {
            // Nếu matchedCount là 1 nhưng modifiedCount là 0, có thể $pull không tìm thấy gì (đã check ở trên bằng orderExists)
            // hoặc $inc không làm thay đổi gì (ví dụ purchaseCount đã là null - không nên).
            // Trường hợp này đã được kiểm tra bằng orderExists, nếu vào đây thì lạ.
            console.warn(`[API Delete Order] Khách hàng được tìm thấy nhưng không có thay đổi nào được ghi nhận (modifiedCount=0). Điều này không mong đợi nếu đơn hàng tồn tại.`);
            // Không nhất thiết phải trả về lỗi nếu đơn hàng đã được xác nhận tồn tại và logic pull đúng.
            // Có thể do $inc không thay đổi nếu purchaseCount không phải là số.
        }
        
        // Đảm bảo purchaseCount không bị âm sau khi giảm
        // Chạy lệnh này riêng biệt để đảm bảo nó được áp dụng ngay cả khi modifiedCount ở trên là 0 (mặc dù không nên)
        await customersCollection.updateOne(
            { _id: customerObjectId, purchaseCount: { $lt: 0 } },
            { $set: { purchaseCount: 0, updatedAt: new Date() } }
        );

        const updatedCustomer = await customersCollection.findOne({ _id: customerObjectId });
        if (!updatedCustomer) {
             console.error("[API Delete Order] Không thể lấy thông tin khách hàng sau khi cập nhật.");
             return res.status(500).json({ message: 'Không thể lấy thông tin khách hàng sau khi cập nhật.' });
        }

        console.log(`[API Delete Order] Order deletion process completed for customer ${updatedCustomer.name}. New purchaseCount: ${updatedCustomer.purchaseCount}`);
        res.status(200).json({ message: 'Đã xóa đơn hàng thành công!', customer: updatedCustomer });

    } catch (error) {
        console.error(`[API Delete Order] SERVER ERROR for customer ${customerIdParam}, order ${orderIdParam}:`, error.message, error.stack);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi xóa đơn hàng', error: error.message });
    }
}
