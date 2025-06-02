// File: api/customers/[id]/[orderId].js
import { MongoClient, ObjectId } from 'mongodb';

let cachedDb = null;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'photoAppDB';

async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    if (!MONGODB_URI) throw new Error('Vui lòng định nghĩa biến môi trường MONGODB_URI');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    cachedDb = db;
    return db;
}

export default async function handler(req, res) {
    const customerIdParam = req.query.id; 
    const orderIdParam = req.query.orderId;

    console.log(`[API Order Action] Received request: Method=<span class="math-inline">\{req\.method\}, CustomerID\=</span>{customerIdParam}, OrderID=${orderIdParam}`);
    if (req.body) console.log(`[API Order Action] Request body:`, req.body);


    if (!ObjectId.isValid(customerIdParam)) {
        return res.status(400).json({ message: `Customer ID không hợp lệ: ${customerIdParam}` });
    }
    if (!ObjectId.isValid(orderIdParam)) {
        return res.status(400).json({ message: `Order ID không hợp lệ: ${orderIdParam}` });
    }

    const customerObjectId = new ObjectId(customerIdParam);
    const orderObjectId = new ObjectId(orderIdParam);

    try {
        const db = await connectToDatabase();
        const customersCollection = db.collection('customers');

        if (req.method === 'DELETE') {
            // ... (Mã xử lý DELETE như bạn đã có và đã hoạt động tốt)
            console.log(`[API Order Action] Attempting to DELETE order ${orderObjectId} for customer ${customerObjectId}`);
            const customerBeforeDelete = await customersCollection.findOne({ _id: customerObjectId });
            if (!customerBeforeDelete) {
                return res.status(404).json({ message: `Không tìm thấy khách hàng với ID: ${customerIdParam}` });
            }
            const orderExists = customerBeforeDelete.orders && customerBeforeDelete.orders.some(order => order.orderId && order.orderId.equals(orderObjectId));
            if (!orderExists) {
                return res.status(404).json({ message: `Đơn hàng với ID ${orderIdParam} không tồn tại trong danh sách của khách hàng.` });
            }

            const result = await customersCollection.updateOne(
                { _id: customerObjectId },
                {
                    $pull: { orders: { orderId: orderObjectId } },
                    $inc: { purchaseCount: -1 },
                    $set: { updatedAt: new Date() }
                }
            );
            if (result.modifiedCount > 0) {
                 await customersCollection.updateOne( // Đảm bảo purchaseCount không âm
                    { _id: customerObjectId, purchaseCount: { $lt: 0 } },
                    { $set: { purchaseCount: 0, updatedAt: new Date() } }
                );
                const updatedCustomer = await customersCollection.findOne({ _id: customerObjectId });
                return res.status(200).json({ message: 'Đã xóa đơn hàng thành công!', customer: updatedCustomer });
            } else {
                // Có thể đơn hàng đã bị xóa bởi request khác, hoặc customerId/orderId không khớp chính xác trong $pull
                console.warn(`[API Order Action] DELETE: No order was modified for customer ${customerIdParam}, order ${orderIdParam}. Matched: ${result.matchedCount}`);
                const currentCustomer = await customersCollection.findOne({ _id: customerObjectId }); // Lấy trạng thái hiện tại
                return res.status(404).json({ message: 'Không tìm thấy đơn hàng để xóa hoặc không có gì thay đổi.', customer: currentCustomer });
            }

        } else if (req.method === 'PUT') {
            // Xử lý cập nhật trạng thái thanh toán
            const { paid } = req.body;
            if (typeof paid !== 'boolean') {
                return res.status(400).json({ message: 'Trạng thái "paid" phải là true hoặc false.' });
            }
            console.log(`[API Order Action] Attempting to update PAID status to ${paid} for order ${orderObjectId} of customer ${customerObjectId}`);

            const result = await customersCollection.updateOne(
                { _id: customerObjectId, "orders.orderId": orderObjectId },
                { 
                    $set: { "orders.$.paid": paid, updatedAt: new Date() } 
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Không tìm thấy khách hàng hoặc đơn hàng để cập nhật trạng thái thanh toán.' });
            }
            if (result.modifiedCount === 0) {
                // Có thể trạng thái paid đã là giá trị mới rồi, không có gì thay đổi.
                console.warn(`[API Order Action] Trạng thái thanh toán cho đơn hàng ${orderIdParam} không thay đổi (có thể đã là ${paid}).`);
            }

            const updatedCustomer = await customersCollection.findOne({ _id: customerObjectId });
            const updatedOrder = updatedCustomer ? updatedCustomer.orders.find(o => o.orderId.equals(orderObjectId)) : null;

            res.status(200).json({ 
                message: 'Cập nhật trạng thái thanh toán thành công!', 
                customer: updatedCustomer, // Trả về cả customer để frontend có thể cập nhật purchaseCount nếu cần trong tương lai
                updatedOrder: updatedOrder // Trả về đơn hàng đã cập nhật
            });

        } else {
            res.setHeader('Allow', ['DELETE', 'PUT']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        console.error(`[API Order Action] SERVER ERROR for customer ${customerIdParam}, order ${orderIdParam}:`, error.message, error.stack);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ', error: error.message });
    }
}
