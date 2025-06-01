// File: api/customers/[id]/[orderId].js
import { MongoClient, ObjectId } from 'mongodb';

let cachedDb = null;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'photoAppDB';

async function connectToDatabase() {
    if (cachedDb) {
        console.log('[API Delete Order] Using cached database instance');
        return cachedDb;
    }
    if (!MONGODB_URI) {
        console.error('[API Delete Order] MONGODB_URI is not defined');
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
    const { id: customerIdParam, orderId: orderIdParam } = req.query;
    
    console.log(`[API Delete Order] Received request: Method=${req.method}, CustomerID=${customerIdParam}, OrderID=${orderIdParam}`);

    if (req.method !== 'DELETE') {
        console.log(`[API Delete Order] Method Not Allowed: ${req.method}`);
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    if (!ObjectId.isValid(customerIdParam)) {
        console.error(`[API Delete Order] Invalid Customer ID: ${customerIdParam}`);
        return res.status(400).json({ message: `Customer ID không hợp lệ: ${customerIdParam}` });
    }
    if (!ObjectId.isValid(orderIdParam)) {
        console.error(`[API Delete Order] Invalid Order ID: ${orderIdParam}`);
        return res.status(400).json({ message: `Order ID không hợp lệ: ${orderIdParam}` });
    }

    const customerObjectId = new ObjectId(customerIdParam);
    const orderObjectId = new ObjectId(orderIdParam);

    try {
        const db = await connectToDatabase();
        const customersCollection = db.collection('customers');

        console.log(`[API Delete Order] Attempting to find customer with _id: ${customerObjectId}`);
        const customerExists = await customersCollection.findOne({ _id: customerObjectId });
        
        if (!customerExists) {
            console.log(`[API Delete Order] Customer not found with _id: ${customerObjectId}`);
            return res.status(404).json({ message: `Không tìm thấy khách hàng với ID: ${customerIdParam}` });
        }
        console.log(`[API Delete Order] Customer found. Orders count: ${customerExists.orders ? customerExists.orders.length : 0}`);

        // Kiểm tra xem đơn hàng có thực sự tồn tại trước khi pull và inc không
        const orderIndex = customerExists.orders ? customerExists.orders.findIndex(o => o.orderId && o.orderId.equals(orderObjectId)) : -1;

        if (orderIndex === -1) {
            console.log(`[API Delete Order] Order with orderId: ${orderObjectId} not found in customer's orders.`);
            return res.status(404).json({ message: `Đơn hàng với ID ${orderIdParam} không tồn tại trong danh sách của khách hàng hoặc đã được xóa.` });
        }
        
        console.log(`[API Delete Order] Order found at index ${orderIndex}. Attempting to pull order and decrement purchaseCount.`);
        const result = await customersCollection.updateOne(
            { _id: customerObjectId },
            {
                $pull: { orders: { orderId: orderObjectId } },
                $inc: { purchaseCount: -1 },
                $set: { updatedAt: new Date() }
            }
        );

        console.log(`[API Delete Order] MongoDB updateOne result: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`);

        if (result.matchedCount === 0) {
            // Điều này không nên xảy ra nếu customerExists là true
            console.error("[API Delete Order] MatchedCount is 0 after customer was found. This is unexpected.");
            return res.status(404).json({ message: `Không tìm thấy khách hàng (lỗi logic).` });
        }

        if (result.modifiedCount === 0) {
            // Nếu đã kiểm tra orderIndex ở trên, thì modifiedCount = 0 ở đây là lạ, có thể do race condition
            console.warn(`[API Delete Order] Khách hàng được tìm thấy nhưng không có đơn hàng nào được xóa (modifiedCount=0). Có thể đơn hàng đã bị xóa bởi một request khác.`);
             // Vẫn trả về khách hàng cập nhật vì purchaseCount có thể đã bị $inc
        }
        
        // Đảm bảo purchaseCount không bị âm
        const finalUpdateResult = await customersCollection.findOneAndUpdate(
            { _id: customerObjectId, purchaseCount: { $lt: 0 } },
            { $set: { purchaseCount: 0, updatedAt: new Date() } },
            { returnDocument: 'after' } // Trả về document sau khi update
        );

        const updatedCustomer = finalUpdateResult || await customersCollection.findOne({ _id: customerObjectId });
        console.log("[API Delete Order] Order deletion process completed. Returning updated customer.");
        res.status(200).json({ message: 'Đã xóa đơn hàng thành công', customer: updatedCustomer });

    } catch (error) {
        console.error(`[API Delete Order] SERVER ERROR for customer ${customerIdParam}, order ${orderIdParam}:`, error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi xóa đơn hàng', error: error.message });
    }
}
