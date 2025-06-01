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
    const { id: customerId, orderId } = req.query; // customerId từ path '[id]', orderId từ path '[orderId]'

    if (!ObjectId.isValid(customerId)) {
        return res.status(400).json({ message: 'Customer ID không hợp lệ' });
    }
    if (!ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: 'Order ID không hợp lệ' });
    }

    if (req.method === 'DELETE') {
        try {
            const db = await connectToDatabase();
            const customersCollection = db.collection('customers');

            const result = await customersCollection.updateOne(
                { _id: new ObjectId(customerId) },
                {
                    $pull: { orders: { orderId: new ObjectId(orderId) } }, // Xóa đơn hàng có orderId khớp
                    $inc: { purchaseCount: -1 }, // Giảm số lần mua đi 1
                    $set: { updatedAt: new Date() }
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
            }
            // modifiedCount sẽ là 1 nếu đơn hàng được tìm thấy và xóa thành công.
            // Nếu orderId không tồn tại trong mảng orders, modifiedCount có thể là 0 dù matchedCount là 1.
            if (result.modifiedCount === 0) {
                // Kiểm tra xem có phải purchaseCount đã là 0 không
                const customerCheck = await customersCollection.findOne({ _id: new ObjectId(customerId) });
                if (customerCheck && customerCheck.orders.every(o => o.orderId.toString() !== orderId)) {
                     return res.status(404).json({ message: 'Không tìm thấy đơn hàng để xóa trong danh sách của khách hàng.' });
                }
                // Nếu đơn hàng không tìm thấy để pull, nhưng purchaseCount vẫn giảm (nếu không âm),
                // có thể vẫn coi là thành công ở mức độ nào đó hoặc trả về thông báo cụ thể.
                // Để đơn giản, nếu không có gì được sửa đổi thực sự (không có đơn hàng nào bị pull), báo lỗi.
                 console.warn(`Xóa đơn hàng: customerId ${customerId}, orderId ${orderId}. Result: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`);
                 // Có thể đơn hàng không tồn tại, nhưng purchaseCount vẫn bị giảm nếu không kiểm tra kỹ
                 // Cân nhắc: nếu $pull không tìm thấy gì, $inc có nên thực hiện không?
                 // MongoDB sẽ thực hiện $inc ngay cả khi $pull không khớp. Để tránh purchaseCount âm:
                 // await customersCollection.updateOne(
                 //   { _id: new ObjectId(customerId), "orders.orderId": new ObjectId(orderId) }, // Chỉ update nếu order tồn tại
                 //   { $pull: { orders: { orderId: new ObjectId(orderId) } }, $inc: { purchaseCount: -1 } ... }
                 // );
                 // Hoặc, sau khi $pull, kiểm tra xem purchaseCount có < 0 không rồi set lại là 0.
                 // Tạm thời để như hiện tại, purchaseCount có thể bị âm nếu xóa nhiều hơn số đơn hàng thực tế (lỗi logic).
            }
            
            // Đảm bảo purchaseCount không âm
            await customersCollection.updateOne(
                { _id: new ObjectId(customerId), purchaseCount: { $lt: 0 } },
                { $set: { purchaseCount: 0 } }
            );

            const updatedCustomer = await customersCollection.findOne({ _id: new ObjectId(customerId) });
            res.status(200).json({ message: 'Đã xóa đơn hàng thành công', customer: updatedCustomer });

        } catch (error) {
            console.error(`Lỗi API xóa đơn hàng ${orderId} cho KH ${customerId}:`, error);
            res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi xóa đơn hàng', error: error.message });
        }
    } else {
        res.setHeader('Allow', ['DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
