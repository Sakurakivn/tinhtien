// File: /api/customers/[id]/orders/import.js
import { MongoClient, ObjectId } from 'mongodb';
import formidable from 'formidable';
import fs from 'fs';

// --- Cấu hình kết nối DB (Tương thích với Vercel) ---
let cachedDb = null;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'photoAppDB';

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    cachedDb = db;
    return db;
}

// --- Logic tính giá (Bắt buộc phải có ở backend) ---
function calculatePrices(pages, isFriend, discountPercentage, printType = 'portrait') {
    if (pages <= 0) return { totalPriceBeforeDiscount: 0, finalTotalPrice: 0, friendDiscountAmount: 0, programDiscountAmount: 0 };
    let pricePerPage;
    if (pages <= 250) pricePerPage = isFriend ? 483 : 543;
    else if (pages <= 500) pricePerPage = isFriend ? 463 : 520;
    else if (pages <= 750) pricePerPage = isFriend ? 436 : 490;
    else pricePerPage = isFriend ? 400 : 450;
    
    let totalSheets = printType === 'landscape' ? pages / 4 : pages / 2;
    let basePrice = totalSheets * pricePerPage;

    const friendDiscountAmount = isFriend ? basePrice * 0.1 : 0;
    const programDiscountAmount = basePrice * (discountPercentage / 100);
    const finalPrice = basePrice - friendDiscountAmount - programDiscountAmount;

    return {
        totalPriceBeforeDiscount: Math.round(basePrice),
        friendDiscountAmount: Math.round(friendDiscountAmount),
        programDiscountAmount: Math.round(programDiscountAmount),
        finalTotalPrice: Math.round(finalPrice),
    };
}

// --- Hàm phân tích cú pháp CSV ---
function parseCsv(data) {
    const rows = data.split(/\r?\n/).map(row => row.trim()).filter(row => row);
    if (rows.length < 1) return []; // Trả về mảng rỗng nếu không có dữ liệu
    const headers = rows.shift().split(',').map(h => h.trim());
    return rows.map(row => {
        const values = row.split(',');
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
            return obj;
        }, {});
    });
}


// --- Handler của API ---
// Vercel yêu cầu tắt bodyParser mặc định khi xử lý file upload
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    const { id: customerId } = req.query;

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Phương thức không được phép.' });
    }
    if (!customerId || !ObjectId.isValid(customerId)) {
        return res.status(400).json({ message: 'ID khách hàng không hợp lệ.' });
    }

    try {
        const db = await connectToDatabase();
        const customersCollection = db.collection('customers');
        const customerObjectId = new ObjectId(customerId);

        const customer = await customersCollection.findOne({ _id: customerObjectId });
        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
        }
        
        const form = formidable({});
        const { files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) return reject(err);
                resolve({ files });
            });
        });

        const ordersFile = files.ordersFile?.[0];
        if (!ordersFile) {
            return res.status(400).json({ message: 'Không có tệp nào được tải lên.' });
        }

        const fileContent = fs.readFileSync(ordersFile.filepath, 'utf8');
        const ordersData = parseCsv(fileContent);

        let successfulImports = 0;
        let failedImports = 0;
        let errors = [];
        const newOrdersArray = [];

        for (const [index, data] of ordersData.entries()) {
            const rowNum = index + 2; // Dòng 1 là header
            try {
                const { TenFile, SoTrang, CachIn, LaKhachThanThiet, GiamGiaChuongTrinh, NgayMua } = data;
                if (!SoTrang || !CachIn || !LaKhachThanThiet) {
                    throw new Error(`Thiếu dữ liệu ở các cột bắt buộc (SoTrang, CachIn, LaKhachThanThiet).`);
                }
                
                const pages = parseInt(SoTrang);
                const isFriend = LaKhachThanThiet.toLowerCase() === 'true';
                const discountPercentage = parseInt(GiamGiaChuongTrinh || '0');
                const printType = CachIn.toLowerCase();

                if (isNaN(pages) || (printType !== 'portrait' && printType !== 'landscape')) {
                    throw new Error(`Dữ liệu không hợp lệ ở cột SoTrang hoặc CachIn.`);
                }
                
                let createdAtDate;
                if (NgayMua) {
                    const parts = NgayMua.split(' ');
                    const dateParts = parts[0].split('/'); // dd/MM/yyyy
                    const timeParts = parts[1] ? parts[1].split(':') : ['00', '00']; // HH:mm
                    // new Date(year, monthIndex, day, hours, minutes)
                    createdAtDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1]);
                    if (isNaN(createdAtDate.getTime())) createdAtDate = new Date(); // Fallback nếu ngày không hợp lệ
                } else {
                    createdAtDate = new Date(); // Lấy ngày giờ hiện tại nếu bỏ trống
                }

                const priceDetails = calculatePrices(pages, isFriend, discountPercentage, printType);
                
                newOrdersArray.push({
                    ...priceDetails,
                    orderId: new ObjectId(),
                    fileName: TenFile || '',
                    pages,
                    printType,
                    friendDiscountApplied: isFriend,
                    programDiscountPercentage: discountPercentage,
                    createdAt: createdAtDate,
                });
                successfulImports++;
            } catch (error) {
                failedImports++;
                errors.push(`Dòng ${rowNum}: ${error.message}`);
            }
        }

        if (newOrdersArray.length > 0) {
            await customersCollection.updateOne(
                { _id: customerObjectId },
                {
                    $push: { orders: { $each: newOrdersArray.reverse() } }, // .reverse() để đơn mới nhất ở đầu
                    $inc: { purchaseCount: newOrdersArray.length },
                    $set: { updatedAt: new Date() }
                }
            );
        }

        const updatedCustomer = await customersCollection.findOne({ _id: customerObjectId });
        res.status(200).json({ successfulImports, failedImports, errors, customer: updatedCustomer });

    } catch (error) {
        console.error("Lỗi API Nhập File:", error);
        res.status(500).json({ 
            message: 'Lỗi máy chủ nội bộ.', 
            error: error.message
        });
    }
}
