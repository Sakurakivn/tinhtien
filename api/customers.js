// File: api/customers.js
import { MongoClient, ObjectId } from 'mongodb';

let cachedDb = null;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'photoAppDB'; // Đặt tên DB mặc định nếu không có trong env

async function connectToDatabase() {
    if (cachedDb) {
        console.log('Using cached database instance');
        return cachedDb;
    }
    if (!MONGODB_URI) {
        throw new Error('Please define the MONGODB_URI environment variable inside .env.local or Vercel environment variables');
    }
    console.log('Connecting to new database instance');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    cachedDb = db;
    return db;
}

export default async function handler(req, res) {
    try {
        const db = await connectToDatabase();
        const customersCollection = db.collection('customers');

        if (req.method === 'GET') {
            if (req.query.id) {
                // ... (logic tìm theo ID giữ nguyên) ...
                 if (!ObjectId.isValid(req.query.id)) {
                    return res.status(400).json({ message: 'ID khách hàng không hợp lệ' });
                }
                const customer = await customersCollection.findOne({ _id: new ObjectId(req.query.id) });
                if (customer) {
                    res.status(200).json(customer);
                } else {
                    res.status(404).json({ message: 'Không tìm thấy khách hàng' });
                }
            } else if (req.query.name) {
                const searchName = req.query.name;
                console.log(`[API Get Customer] Searching for name (case-insensitive): "${searchName}"`);
                
                // Sử dụng regular expression để tìm kiếm không phân biệt hoa thường
                // 'i' flag cho case-insensitive
                // Cần escape các ký tự đặc biệt trong regex nếu tên có thể chứa chúng,
                // nhưng với tên người Việt thông thường thì có thể không quá cần thiết.
                // Để an toàn hơn, bạn có thể dùng một hàm để escape regex.
                // Ví dụ đơn giản:
                const customer = await customersCollection.findOne({ 
                    name: { $regex: `^${searchName}$`, $options: 'i' } 
                });
                // Giải thích:
                // - `^${searchName}$`: Đảm bảo khớp toàn bộ chuỗi tên, không phải chỉ một phần.
                //   Nếu bạn muốn tìm kiếm gần đúng (ví dụ "an" khớp với "Đức An"), bạn có thể bỏ `^` và `$`,
                //   ví dụ: name: { $regex: searchName, $options: 'i' }
                //   Tuy nhiên, để tra cứu chính xác tên nhưng không phân biệt hoa/thường, `^...$` là tốt.
                // - `$options: 'i'`: Bật chế độ không phân biệt hoa/thường.

                if (customer) {
                    console.log(`[API Get Customer] Found customer:`, customer.name);
                    res.status(200).json(customer);
                } else {
                    console.log(`[API Get Customer] Customer not found with name (case-insensitive): "${searchName}"`);
                    res.status(404).json({ message: `Không tìm thấy khách hàng với tên (không phân biệt hoa/thường): "${searchName}"` });
                }
            } else if (req.query.name) {
                const customer = await customersCollection.findOne({ name: req.query.name }); // Tìm chính xác theo tên
                if (customer) {
                    res.status(200).json(customer);
                } else {
                    // Có thể trả về 404 hoặc một đối tượng rỗng/thông báo tùy theo logic frontend
                    res.status(404).json({ message: `Không tìm thấy khách hàng với tên "${req.query.name}"` });
                }
            } else {
                const customers = await customersCollection.find({}).sort({ name: 1 }).toArray();
                res.status(200).json(customers);
            }
        } else if (req.method === 'POST') {
            const { name, class: customerClassValue, purchaseCount = 0, orders = [] } = req.body;
            if (!name) {
                return res.status(400).json({ message: 'Tên khách hàng là bắt buộc' });
            }
            const existingCustomer = await customersCollection.findOne({ name });
            if (existingCustomer) {
                // Nếu đã tồn tại, có thể trả về thông tin khách hàng đó hoặc lỗi tùy logic
                // Ở đây, ta trả về khách hàng đã tồn tại để frontend có thể sử dụng ID
                return res.status(200).json({ message: 'Khách hàng đã tồn tại', customer: existingCustomer });
            }
            const newCustomerData = { 
                name, 
                class: customerClassValue || '', 
                purchaseCount, 
                orders, 
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const result = await customersCollection.insertOne(newCustomerData);
            // Trả về khách hàng vừa tạo với _id từ MongoDB
            res.status(201).json({ ...newCustomerData, _id: result.insertedId });

        } else if (req.method === 'PUT') {
            // API để cập nhật thông tin khách hàng (ví dụ: tên, lớp)
            // Truyền ID của khách hàng qua query parameter, ví dụ: /api/customers?id=CUSTOMER_ID
            const { id } = req.query;
            const { name, class: customerClassValue } = req.body;

            if (!id || !ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'ID khách hàng không hợp lệ hoặc bị thiếu' });
            }

            const updateFields = { updatedAt: new Date() };
            if (name) updateFields.name = name;
            if (typeof customerClassValue !== 'undefined') updateFields.class = customerClassValue;
            
            // Nếu đổi tên, kiểm tra tên mới có trùng với khách hàng khác không
            if (name) {
                const conflictingCustomer = await customersCollection.findOne({ name: name, _id: { $ne: new ObjectId(id) } });
                if (conflictingCustomer) {
                    return res.status(409).json({ message: 'Tên khách hàng mới đã được sử dụng bởi một khách hàng khác.' });
                }
            }

            const result = await customersCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateFields }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Không tìm thấy khách hàng để cập nhật' });
            }
            const updatedCustomer = await customersCollection.findOne({ _id: new ObjectId(id) });
            res.status(200).json(updatedCustomer);
        }
        // TODO: Thêm các API khác nếu cần (ví dụ: DELETE customer, API cho orders)
        else {
            res.setHeader('Allow', ['GET', 'POST', 'PUT']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        console.error("Lỗi API:", error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ', error: error.message });
    }
}
