// File: api/customers/[id]/orders.js
import { MongoClient, ObjectId } from 'mongodb';

let cachedDb = null;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'photoAppDB';

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

// Hàm parse chuỗi ngày "dd/mm/yyyy, HH:MM:SS" từ client thành Date object
function parseClientDateTimeToUTCDate(clientDateTimeString) {
    if (!clientDateTimeString) {
        console.warn("[API Add Order] clientDateTimeString for createdAt is undefined or null, defaulting to current server date.");
        return new Date(); 
    }
    
    console.log(`[API Add Order] Parsing client date string for createdAt: ${clientDateTimeString}`);
    const parts = clientDateTimeString.split(', '); 
    const dateParts = parts[0].split('/'); 
    const timeParts = parts[1] ? parts[1].split(':') : ['00', '00', '00']; 

    const year = parseInt(dateParts[2]);
    const month = parseInt(dateParts[1]) - 1; // Tháng trong JavaScript là 0-indexed
    const day = parseInt(dateParts[0]);
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = parseInt(timeParts[2] || '0');

    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        console.error("[API Add Order] Invalid date/time components for createdAt after parsing:", {year, month, day, hours, minutes, seconds}, "Original string:", clientDateTimeString);
        return new Date(); // Fallback nếu parse lỗi, trả về ngày hiện tại của server
    }
    const parsedDate = new Date(year, month, day, hours, minutes, seconds);
    console.log(`[API Add Order] Parsed date object for createdAt: ${parsedDate.toISOString()}`);
    return parsedDate;
}

export default async function handler(req, res) {
    const customerIdParam = req.query.id; 

    console.log(`[API Add Order] Received request: Method=${req.method}, CustomerID Param=${customerIdParam}`);
    if (req.body) console.log(`[API Add Order] Request body:`, req.body);


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

        // Kiểm tra xem client có gửi 'createdAt' không
        if (!orderDataFromClient.createdAt || typeof orderDataFromClient.createdAt !== 'string') {
            console.error("[API Add Order] Missing or invalid 'createdAt' field from client data. Received:", orderDataFromClient.createdAt);
            return res.status(400).json({ message: "Thiếu thông tin 'Ngày mua' (createdAt) hoặc định dạng không đúng từ client." });
        }

        const newOrder = {
            ...orderDataFromClient, 
            orderId: new ObjectId(), 
            // QUAN TRỌNG: Sử dụng giá trị createdAt từ client đã được parse
            createdAt: parseClientDateTimeToUTCDate(orderDataFromClient.createdAt) 
        };
        // Xóa createdAtDate nếu client có thể đã gửi lên (để đảm bảo dùng createdAt đã chuẩn hóa)
        delete newOrder.createdAtDate; 

        console.log("[API Add Order] New order object to be pushed (using client's parsed createdAt):", newOrder);

        const result = await customersCollection.updateOne(
            { _id: customerObjectId },
            {
                $push: { orders: newOrder },      
                $inc: { purchaseCount: 1 },       
                $set: { updatedAt: new Date() }   
            }
        );

        console.log(`[API Add Order] MongoDB updateOne result: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`);

        if (result.matchedCount === 0) {
            console.error("[API Add Order] Customer was found but updateOne matched 0 documents. This is unexpected.");
            return res.status(404).json({ message: 'Không tìm thấy khách hàng để thêm đơn hàng (lỗi logic không mong muốn).' });
        }
        // Với $push và $inc, modifiedCount nên là 1 nếu matchedCount là 1.
        if (result.modifiedCount === 0 ) {
             console.warn("[API Add Order] Order might not have been added or purchaseCount not incremented (modifiedCount is 0). This is unusual if customer was matched.");
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
