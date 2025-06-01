// File: api/customers/[id]/orders.js
import { MongoClient, ObjectId } from 'mongodb';

let cachedDb = null;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'photoAppDB'; // Đảm bảo tên DB này đúng

async function connectToDatabase() {
    if (cachedDb) {
        console.log('[API Add Order] Using cached database instance');
        return cachedDb;
    }
    if (!MONGODB_URI) {
        console.error('[API Add Order] MONGODB_URI is not defined');
        throw new Error('Vui lòng định nghĩa biến môi trường MONGODB_URI');
    }
    console.log('[API Add Order] Connecting to new database instance...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    cachedDb = db;
    console.log('[API Add Order] Database connection established.');
    return db;
}

// Hàm phụ trợ để parse chuỗi ngày tháng từ client (ví dụ: "dd/mm/yyyy, HH:MM:SS")
function parseClientDateTimeToUTCDate(clientDateTimeString) {
    if (!clientDateTimeString) {
        console.warn("[API Add Order] clientDateTimeString is undefined or null, defaulting to current date.");
        return new Date(); 
    }
    
    console.log(`[API Add Order] Parsing client date string: ${clientDateTimeString}`);
    const parts = clientDateTimeString.split(', '); 
    const dateParts = parts[0].split('/'); 
    const timeParts = parts[1] ? parts[1].split(':') : ['00', '00', '00']; 

    const year = parseInt(dateParts[2]);
    const month = parseInt(dateParts[1]) - 1; 
    const day = parseInt(dateParts[0]);
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = parseInt(timeParts[2] || '0');

    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        console.error("[API Add Order] Invalid date/time components after parsing:", {year, month, day, hours, minutes, seconds});
        return new Date(); // Trả về ngày hiện tại nếu parse lỗi
    }
    const parsedDate = new Date(year, month, day, hours, minutes, seconds);
    console.log(`[API Add Order] Parsed date object: ${parsedDate.toISOString()}`);
    return parsedDate;
}

export default async function handler(req, res) {
    const customerIdParam = req.query.id; // Lấy customerId từ path segment '[id]'

    console.log(`[API Add Order] Received request: Method=${req.method}, CustomerID Param=${customerIdParam}`);
    console.log(`[API Add Order] Request body:`, req.body);

    if (req.method !== 'POST') {
        console.log(`[API Add Order] Method Not Allowed: ${req.method}`);
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    if (!customerIdParam || !ObjectId.isValid(customerIdParam)) {
        console.error(`[API Add Order] Invalid Customer ID Param: ${customerIdParam}`);
        return res.status(400).json({ message: `Customer ID không hợp lệ hoặc bị thiếu: ${customerIdParam}` });
    }

    const customerObjectId = new ObjectId(customerIdParam);

    try {
        const db = await connectToDatabase();
        const customersCollection = db.collection('customers');

        const orderDataFromClient = req.body; 
        if (!orderDataFromClient || Object.keys(orderDataFromClient).length === 0) {
            console.error("[API Add Order] Order data is empty.");
            return res.status(400).json({ message: 'Dữ liệu đơn hàng không được để trống' });
        }

        console.log(`[API Add Order] Validating customer existence with _id: ${customerObjectId}`);
        const customerExists = await customersCollection.findOne({ _id: customerObjectId });
        if (!customerExists) {
            console.error(`[API Add Order] Customer not found with _id: ${customerObjectId}`);
            return res.status(404).json({ message: `Không tìm thấy khách hàng với ID: ${customerIdParam} để thêm đơn hàng.` });
        }
        console.log(`[API Add Order] Customer ${customerExists.name} found. Proceeding to add order.`);

        const newOrder = {
            ...orderDataFromClient, 
            orderId: new ObjectId(), // Tạo ID duy nhất cho đơn hàng này
            createdAt: parseClientDateTimeToUTCDate(orderDataFromClient.createdAt), 
        };
        // Xóa createdAtDate nếu client có gửi lên, vì chúng ta dùng createdAt chuẩn từ server đã được parse
        delete newOrder.createdAtDate; 

        console.log("[API Add Order] New order object to be pushed:", newOrder);

        const result = await customersCollection.updateOne(
            { _id: customerObjectId },
            {
                $push: { orders: newOrder },      
                $inc: { purchaseCount: 1 },       
                $set: { updatedAt: new Date() }   
            }
        );

        console.log(`[API Add Order] MongoDB updateOne result: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}, upsertedId=${result.upsertedId}`);

        if (result.matchedCount === 0) {
            console.error("[API Add Order] Customer was found but updateOne matched 0 documents. This is unexpected.");
            return res.status(404).json({ message: 'Không tìm thấy khách hàng để thêm đơn hàng (lỗi logic không mong muốn).' });
        }
        if (result.modifiedCount === 0 && result.upsertedCount === 0) { // Sửa lại điều kiện này
            console.warn("[API Add Order] Order might not have been added or purchaseCount not incremented (modifiedCount is 0 and no upsert). This can happen if the document was matched but the update operation resulted in no change.");
            // Tuy nhiên, với $push và $inc, modifiedCount phải > 0 nếu matchedCount > 0.
            // Trừ khi có vấn đề với kiểu dữ liệu của purchaseCount hoặc mảng orders.
        }

        const updatedCustomer = await customersCollection.findOne({ _id: customerObjectId });
        if (!updatedCustomer) {
            console.error("[API Add Order] Cannot retrieve updated customer information after adding order.");
            return res.status(500).json({ message: 'Không thể lấy thông tin khách hàng sau khi thêm đơn hàng.'})
        }
        console.log(`[API Add Order] Order added successfully for customer ${updatedCustomer.name}. New purchaseCount: ${updatedCustomer.purchaseCount}`);
        res.status(201).json({ message: 'Đã thêm đơn hàng thành công!', customer: updatedCustomer });

    } catch (error) {
        console.error(`[API Add Order] SERVER ERROR for customer ${customerIdParam}:`, error.message, error.stack);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi xử lý đơn hàng', error: error.message });
    }
}
